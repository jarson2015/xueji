import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, LessThan, MoreThanOrEqual, Repository } from 'typeorm';
import {
  JournalComment,
  JournalPost,
  JournalReaderState,
  JournalStudentPrefs,
  JournalUserPrefs,
  PrivateDiaryEntry,
} from '../entities/journal.entity';
import { User } from '../entities/user.entity';
import { UserRole } from '../common/enums';
import { isValidMoodTag } from '../common/mood-policy';
import { StudentsService } from '../students/students.service';
import { RateLimitService } from '../common/rate-limit.service';
import { AuditService } from '../family/audit.service';
import { PushService } from '../push/push.service';
import { assertJournalPrivateAccess } from './journal-privacy';
import { fillVisiblePosts } from './journal-visibility';
import { canEditWithinWindow } from './journal-edit-window';
import { requireSafeUploadPath } from '../common/upload-url';

export type AuthUser = {
  id: number;
  role: string;
  name?: string;
  isProxy?: boolean;
};

const POST_MAX = 500;
const COMMENT_MAX = 200;
const DIARY_MAX = 500;
const LIST_FILL_ROUNDS = 4;
const MAX_IMAGES = 3;

function startOfIsoWeek(d = new Date()): Date {
  const day = d.getDay() || 7;
  const monday = new Date(d);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(d.getDate() - day + 1);
  return monday;
}

@Injectable()
export class JournalService {
  constructor(
    @InjectRepository(JournalPost) private readonly posts: Repository<JournalPost>,
    @InjectRepository(JournalComment)
    private readonly comments: Repository<JournalComment>,
    @InjectRepository(PrivateDiaryEntry)
    private readonly diaries: Repository<PrivateDiaryEntry>,
    @InjectRepository(JournalStudentPrefs)
    private readonly prefs: Repository<JournalStudentPrefs>,
    @InjectRepository(JournalUserPrefs)
    private readonly userPrefs: Repository<JournalUserPrefs>,
    @InjectRepository(JournalReaderState)
    private readonly readerState: Repository<JournalReaderState>,
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly students: StudentsService,
    private readonly rateLimit: RateLimitService,
    private readonly audit: AuditService,
    @Optional() private readonly push?: PushService,
  ) {}

  async familyMemberIds(userId: number, role: string): Promise<number[]> {
    const ids = new Set<number>([userId]);
    if (role === UserRole.PARENT) {
      const sids = await this.students.getStudentIdsOfParent(userId);
      for (const sid of sids) {
        ids.add(sid);
        for (const pid of await this.students.getParentIdsOfStudent(sid)) {
          ids.add(pid);
        }
      }
    } else {
      const pids = await this.students.getParentIdsOfStudent(userId);
      for (const pid of pids) {
        ids.add(pid);
        for (const sid of await this.students.getStudentIdsOfParent(pid)) {
          ids.add(sid);
        }
      }
    }
    return [...ids];
  }

  private assertStudentSelf(user: AuthUser) {
    assertJournalPrivateAccess(user);
  }

  private normalizeMood(moodTag?: string | null) {
    if (moodTag == null || moodTag === '') return null;
    if (!isValidMoodTag(moodTag)) {
      throw new BadRequestException('情绪标签无效');
    }
    return moodTag;
  }

  private trimBody(body: string, max: number, label: string) {
    const t = String(body || '').trim();
    if (!t) throw new BadRequestException(`${label}不能为空`);
    if (t.length > max) throw new BadRequestException(`${label}过长`);
    return t;
  }

  private assertEditable(createdAt: Date) {
    if (!canEditWithinWindow(createdAt)) {
      throw new ForbiddenException('已超过可编辑时间（发布后 15 分钟内）');
    }
  }

  private normalizeImageUrls(urls?: string[] | null): string[] | null {
    if (urls == null) return null;
    if (!Array.isArray(urls)) {
      throw new BadRequestException('配图格式无效');
    }
    if (urls.length > MAX_IMAGES) {
      throw new BadRequestException(`最多上传 ${MAX_IMAGES} 张图`);
    }
    const cleaned = urls
      .map((u) => String(u || '').trim())
      .filter(Boolean)
      .map((u) => requireSafeUploadPath(u));
    return cleaned.length ? cleaned : null;
  }

  private mapPostRow(
    p: JournalPost,
    user: AuthUser,
    nameMap: Map<number, string>,
    authors: User[],
    commentCounts: Map<number, number>,
  ) {
    return {
      id: p.id,
      authorId: p.authorId,
      authorName: nameMap.get(p.authorId) || '家人',
      authorRole:
        authors.find((a) => a.id === p.authorId)?.role || UserRole.STUDENT,
      title: p.title,
      body: p.body,
      moodTag: p.moodTag,
      visibility: p.visibility,
      sourcePrivateDiaryId: p.sourcePrivateDiaryId,
      imageUrls: p.imageUrls || [],
      commentCount: commentCounts.get(p.id) || 0,
      createdAt: p.createdAt,
      canEdit: p.authorId === user.id && canEditWithinWindow(p.createdAt),
    };
  }

  async listPosts(user: AuthUser, opts?: { limit?: number; beforeId?: number }) {
    const members = await this.familyMemberIds(user.id, user.role);
    const limit = Math.min(Math.max(opts?.limit || 30, 1), 50);
    const isParent = user.role === UserRole.PARENT;
    const collected: JournalPost[] = [];
    let cursor = opts?.beforeId;
    const batch = Math.max(limit * 3, 30);

    for (let round = 0; round < LIST_FILL_ROUNDS && collected.length < limit; round++) {
      const where: any = {
        authorId: In(members),
        status: 'active',
      };
      if (cursor) where.id = LessThan(cursor);

      const rows = await this.posts.find({
        where,
        order: { id: 'DESC' },
        take: batch,
      });
      if (!rows.length) break;

      const visible = fillVisiblePosts(rows, {
        isParent,
        viewerId: user.id,
        limit: limit - collected.length,
      });
      collected.push(...visible);
      cursor = rows[rows.length - 1].id;
      if (rows.length < batch) break;
    }

    const authorIds = [...new Set(collected.map((r) => r.authorId))];
    const authors = authorIds.length
      ? await this.users.find({ where: { id: In(authorIds) } })
      : [];
    const nameMap = new Map(authors.map((a) => [a.id, a.name]));

    const commentCounts = new Map<number, number>();
    if (collected.length) {
      const raw = await this.comments
        .createQueryBuilder('c')
        .select('c.post_id', 'postId')
        .addSelect('COUNT(*)', 'cnt')
        .where('c.post_id IN (:...ids)', { ids: collected.map((r) => r.id) })
        .andWhere('c.status = :st', { st: 'active' })
        .groupBy('c.post_id')
        .getRawMany();
      for (const r of raw) {
        commentCounts.set(Number(r.postId), Number(r.cnt));
      }
    }

    return collected.map((p) =>
      this.mapPostRow(p, user, nameMap, authors, commentCounts),
    );
  }

  async createPost(
    user: AuthUser,
    dto: {
      body?: string;
      title?: string;
      moodTag?: string;
      visibility?: 'family' | 'parents';
      imageUrls?: string[];
    },
  ) {
    this.rateLimit.consume(`journal:post:${user.id}`, 20, 60 * 60 * 1000);
    const imageUrls = this.normalizeImageUrls(dto.imageUrls ?? []);
    let body = String(dto.body || '').trim();
    if (!body && !(imageUrls && imageUrls.length)) {
      throw new BadRequestException('正文不能为空');
    }
    if (!body && imageUrls?.length) body = '（附图）';
    if (body.length > POST_MAX) throw new BadRequestException('正文过长');
    const visibility = dto.visibility === 'parents' ? 'parents' : 'family';
    const title = dto.title?.trim() ? dto.title.trim().slice(0, 80) : null;
    const post = await this.posts.save(
      this.posts.create({
        authorId: user.id,
        body,
        title,
        moodTag: this.normalizeMood(dto.moodTag),
        visibility,
        status: 'active',
        sourcePrivateDiaryId: null,
        imageUrls,
      }),
    );
    return this.getPost(user, post.id);
  }

  async updatePost(
    user: AuthUser,
    postId: number,
    dto: {
      body?: string;
      moodTag?: string | null;
      visibility?: 'family' | 'parents';
      imageUrls?: string[] | null;
    },
  ) {
    const post = await this.posts.findOne({
      where: { id: postId, status: 'active' },
    });
    if (!post) throw new NotFoundException('说说不存在');
    if (post.authorId !== user.id) {
      throw new ForbiddenException('只能编辑自己的说说');
    }
    this.assertEditable(post.createdAt);
    if (dto.body != null) {
      post.body = this.trimBody(dto.body, POST_MAX, '正文');
    }
    if (dto.moodTag !== undefined) {
      post.moodTag = this.normalizeMood(dto.moodTag);
    }
    if (dto.visibility === 'parents' || dto.visibility === 'family') {
      post.visibility = dto.visibility;
    }
    if (dto.imageUrls !== undefined) {
      post.imageUrls = this.normalizeImageUrls(dto.imageUrls ?? []);
    }
    await this.posts.save(post);
    return this.getPost(user, post.id);
  }

  private async assertCanReadPost(user: AuthUser, postId: number) {
    const post = await this.posts.findOne({
      where: { id: postId, status: 'active' },
    });
    if (!post) throw new NotFoundException('手账不存在');
    const members = await this.familyMemberIds(user.id, user.role);
    if (!members.includes(post.authorId)) {
      throw new NotFoundException('手账不存在');
    }
    if (
      post.visibility === 'parents' &&
      user.role !== UserRole.PARENT &&
      post.authorId !== user.id
    ) {
      throw new ForbiddenException('仅家长可见');
    }
    return post;
  }

  async getPost(user: AuthUser, postId: number) {
    const post = await this.assertCanReadPost(user, postId);
    const author = await this.users.findOne({ where: { id: post.authorId } });
    const comments = await this.listComments(user, postId);
    return {
      id: post.id,
      authorId: post.authorId,
      authorName: author?.name || '家人',
      authorRole: author?.role || UserRole.STUDENT,
      title: post.title,
      body: post.body,
      moodTag: post.moodTag,
      visibility: post.visibility,
      sourcePrivateDiaryId: post.sourcePrivateDiaryId,
      imageUrls: post.imageUrls || [],
      createdAt: post.createdAt,
      canEdit: post.authorId === user.id && canEditWithinWindow(post.createdAt),
      comments,
    };
  }

  async softDeletePost(user: AuthUser, postId: number) {
    const post = await this.posts.findOne({
      where: { id: postId, status: 'active' },
    });
    if (!post) throw new NotFoundException('手账不存在');
    const members = await this.familyMemberIds(user.id, user.role);
    if (!members.includes(post.authorId)) {
      throw new NotFoundException('手账不存在');
    }
    const isAuthor = post.authorId === user.id;
    const isParent = user.role === UserRole.PARENT;
    if (!isAuthor && !isParent) {
      throw new ForbiddenException('无权删除');
    }
    post.status = 'deleted';
    await this.posts.save(post);
    void this.audit.record({
      actorId: user.id,
      actorName: user.name,
      action: 'journal.post.delete',
      targetType: 'journal_post',
      targetId: post.id,
      studentId: post.authorId !== user.id ? post.authorId : undefined,
      detail: {
        authorId: post.authorId,
        visibility: post.visibility,
        byParent: isParent && !isAuthor,
      },
    });
    return { ok: true };
  }

  async listComments(user: AuthUser, postId: number) {
    await this.assertCanReadPost(user, postId);
    const rows = await this.comments.find({
      where: { postId, status: 'active' },
      order: { id: 'ASC' },
      take: 200,
    });
    const authorIds = [...new Set(rows.map((c) => c.authorId))];
    const authors = authorIds.length
      ? await this.users.find({ where: { id: In(authorIds) } })
      : [];
    const nameMap = new Map(authors.map((a) => [a.id, a.name]));
    const mapOne = (c: JournalComment) => ({
      id: c.id,
      authorId: c.authorId,
      authorName: nameMap.get(c.authorId) || '家人',
      body: c.body,
      parentCommentId: c.parentCommentId,
      createdAt: c.createdAt,
    });
    const top = rows.filter((c) => c.parentCommentId == null);
    const replies = rows.filter((c) => c.parentCommentId != null);
    return top.map((c) => ({
      ...mapOne(c),
      replies: replies
        .filter((r) => r.parentCommentId === c.id)
        .map(mapOne),
    }));
  }

  async addComment(
    user: AuthUser,
    postId: number,
    bodyRaw: string,
    parentCommentId?: number | null,
  ) {
    this.rateLimit.consume(`journal:comment:${user.id}`, 40, 60 * 60 * 1000);
    await this.assertCanReadPost(user, postId);
    const body = this.trimBody(bodyRaw, COMMENT_MAX, '评论');
    let parentId: number | null = null;
    if (parentCommentId) {
      const parent = await this.comments.findOne({
        where: { id: parentCommentId, postId, status: 'active' },
      });
      if (!parent) throw new NotFoundException('要回复的回应不存在');
      if (parent.parentCommentId != null) {
        throw new BadRequestException('只能回复一层');
      }
      parentId = parent.id;
    }
    const c = await this.comments.save(
      this.comments.create({
        postId,
        authorId: user.id,
        body,
        parentCommentId: parentId,
        status: 'active',
      }),
    );
    const author = await this.users.findOne({ where: { id: user.id } });
    const post = await this.posts.findOne({ where: { id: postId } });
    if (post && post.authorId !== user.id && this.push) {
      const allowPush = await this.isCommentPushEnabled(post.authorId);
      if (allowPush) {
        const postAuthor = await this.users.findOne({
          where: { id: post.authorId },
        });
        const url =
          postAuthor?.role === UserRole.PARENT
            ? '/parent/journal'
            : '/student/journal';
        const who = author?.name || '家人';
        void this.push.sendToUser(post.authorId, {
          title: '说说有新回应',
          body: `${who}回复了你：${body.slice(0, 40)}`,
          url: `${url}?postId=${postId}`,
          tag: `journal-comment-${c.id}`,
        });
      }
    }
    return {
      id: c.id,
      authorId: c.authorId,
      authorName: author?.name || '家人',
      body: c.body,
      parentCommentId: c.parentCommentId,
      createdAt: c.createdAt,
      replies: [] as any[],
    };
  }

  async isCommentPushEnabled(userId: number): Promise<boolean> {
    const row = await this.userPrefs.findOne({ where: { userId } });
    if (!row) return true;
    return !!row.commentPushEnabled;
  }

  async getNotifyPrefs(user: AuthUser) {
    const row = await this.userPrefs.findOne({ where: { userId: user.id } });
    return {
      commentPushEnabled: row ? !!row.commentPushEnabled : true,
    };
  }

  async setNotifyPrefs(user: AuthUser, commentPushEnabled: boolean) {
    let row = await this.userPrefs.findOne({ where: { userId: user.id } });
    if (!row) {
      row = this.userPrefs.create({
        userId: user.id,
        commentPushEnabled: !!commentPushEnabled,
      });
    } else {
      row.commentPushEnabled = !!commentPushEnabled;
    }
    await this.userPrefs.save(row);
    return { commentPushEnabled: !!row.commentPushEnabled };
  }

  async softDeleteComment(user: AuthUser, commentId: number) {
    const c = await this.comments.findOne({
      where: { id: commentId, status: 'active' },
    });
    if (!c) throw new NotFoundException('评论不存在');
    await this.assertCanReadPost(user, c.postId);
    const isAuthor = c.authorId === user.id;
    const isParent = user.role === UserRole.PARENT;
    if (!isAuthor && !isParent) {
      throw new ForbiddenException('无权删除');
    }
    c.status = 'deleted';
    await this.comments.save(c);
    void this.audit.record({
      actorId: user.id,
      actorName: user.name,
      action: 'journal.comment.delete',
      targetType: 'journal_comment',
      targetId: c.id,
      detail: {
        postId: c.postId,
        authorId: c.authorId,
        byParent: isParent && !isAuthor,
      },
    });
    return { ok: true };
  }

  async getPrefs(user: AuthUser) {
    this.assertStudentSelf(user);
    const row = await this.prefs.findOne({ where: { studentId: user.id } });
    return {
      privateDiaryEnabled: !!row?.privateDiaryEnabled,
      privateDiaryEnabledAt: row?.privateDiaryEnabledAt || null,
    };
  }

  async setPrefs(user: AuthUser, enabled: boolean) {
    this.assertStudentSelf(user);
    let row = await this.prefs.findOne({ where: { studentId: user.id } });
    if (!row) {
      row = this.prefs.create({
        studentId: user.id,
        privateDiaryEnabled: false,
        privateDiaryEnabledAt: null,
      });
    }
    if (enabled && !row.privateDiaryEnabled) {
      row.privateDiaryEnabled = true;
      row.privateDiaryEnabledAt = new Date();
    } else if (!enabled) {
      row.privateDiaryEnabled = false;
    }
    await this.prefs.save(row);
    return this.getPrefs(user);
  }

  private async requireDiaryEnabled(user: AuthUser) {
    this.assertStudentSelf(user);
    const row = await this.prefs.findOne({ where: { studentId: user.id } });
    if (!row?.privateDiaryEnabled) {
      throw new ForbiddenException('请先自愿开启私密日记');
    }
  }

  /** 关闭后仍可只读列出；新建/删/分享需开启 */
  async listDiary(user: AuthUser) {
    this.assertStudentSelf(user);
    const row = await this.prefs.findOne({ where: { studentId: user.id } });
    const enabled = !!row?.privateDiaryEnabled;
    const rows = await this.diaries.find({
      where: { studentId: user.id, status: 'active' },
      order: { id: 'DESC' },
      take: 50,
    });
    return {
      privateDiaryEnabled: enabled,
      readonly: !enabled,
      items: rows.map((d) => ({
        id: d.id,
        body: d.body,
        moodTag: d.moodTag,
        createdAt: d.createdAt,
        canEdit: enabled && canEditWithinWindow(d.createdAt),
      })),
    };
  }

  async createDiary(user: AuthUser, dto: { body: string; moodTag?: string }) {
    await this.requireDiaryEnabled(user);
    this.rateLimit.consume(`journal:diary:${user.id}`, 30, 60 * 60 * 1000);
    const body = this.trimBody(dto.body, DIARY_MAX, '日记');
    const d = await this.diaries.save(
      this.diaries.create({
        studentId: user.id,
        body,
        moodTag: this.normalizeMood(dto.moodTag),
        status: 'active',
      }),
    );
    return {
      id: d.id,
      body: d.body,
      moodTag: d.moodTag,
      createdAt: d.createdAt,
      canEdit: canEditWithinWindow(d.createdAt),
    };
  }

  async updateDiary(
    user: AuthUser,
    id: number,
    dto: { body?: string; moodTag?: string | null },
  ) {
    await this.requireDiaryEnabled(user);
    const d = await this.diaries.findOne({
      where: { id, studentId: user.id, status: 'active' },
    });
    if (!d) throw new NotFoundException('日记不存在');
    this.assertEditable(d.createdAt);
    if (dto.body != null) {
      d.body = this.trimBody(dto.body, DIARY_MAX, '日记');
    }
    if (dto.moodTag !== undefined) {
      d.moodTag = this.normalizeMood(dto.moodTag);
    }
    await this.diaries.save(d);
    return {
      id: d.id,
      body: d.body,
      moodTag: d.moodTag,
      createdAt: d.createdAt,
      canEdit: canEditWithinWindow(d.createdAt),
    };
  }

  async softDeleteDiary(user: AuthUser, id: number) {
    await this.requireDiaryEnabled(user);
    const d = await this.diaries.findOne({
      where: { id, studentId: user.id, status: 'active' },
    });
    if (!d) throw new NotFoundException('日记不存在');
    d.status = 'deleted';
    await this.diaries.save(d);
    return { ok: true };
  }

  async shareDiaryToFamily(
    user: AuthUser,
    diaryId: number,
    opts?: { visibility?: 'family' | 'parents'; force?: boolean },
  ) {
    await this.requireDiaryEnabled(user);
    this.rateLimit.consume(`journal:share:${user.id}`, 10, 60 * 60 * 1000);
    this.rateLimit.consume(
      `journal:share-diary:${user.id}:${diaryId}`,
      1,
      30 * 1000,
    );
    const d = await this.diaries.findOne({
      where: { id: diaryId, studentId: user.id, status: 'active' },
    });
    if (!d) throw new NotFoundException('日记不存在');

    const existing = await this.posts.findOne({
      where: {
        sourcePrivateDiaryId: d.id,
        status: 'active',
      },
    });
    if (existing && !opts?.force) {
      throw new ConflictException('该日记已分享过，确认要再发一条吗？');
    }

    const visibility =
      opts?.visibility === 'parents' ? 'parents' : 'family';
    const post = await this.posts.save(
      this.posts.create({
        authorId: user.id,
        body: d.body,
        title: null,
        moodTag: d.moodTag,
        visibility,
        status: 'active',
        sourcePrivateDiaryId: d.id,
      }),
    );
    return this.getPost(user, post.id);
  }

  async activityHint(user: AuthUser) {
    const members = await this.familyMemberIds(user.id, user.role);
    const weekStart = startOfIsoWeek();
    let weekRows = await this.posts.find({
      where: {
        authorId: In(members),
        status: 'active',
        createdAt: MoreThanOrEqual(weekStart),
      },
      order: { id: 'DESC' },
      take: 80,
    });
    const isParent = user.role === UserRole.PARENT;
    weekRows = weekRows.filter((p) => {
      if (p.visibility === 'family') return true;
      if (p.visibility === 'parents') {
        return isParent || p.authorId === user.id;
      }
      return false;
    });
    const weekPostCount = weekRows.length;

    const state = await this.readerState.findOne({ where: { userId: user.id } });
    const seenAt = state?.feedSeenAt || new Date(0);
    const myPosts = await this.posts.find({
      where: { authorId: user.id, status: 'active' },
      select: ['id'],
      take: 200,
    });
    let newReplyCount = 0;
    if (myPosts.length) {
      newReplyCount = await this.comments
        .createQueryBuilder('c')
        .where('c.post_id IN (:...ids)', { ids: myPosts.map((p) => p.id) })
        .andWhere('c.status = :st', { st: 'active' })
        .andWhere('c.author_id != :uid', { uid: user.id })
        .andWhere('c.created_at > :seen', { seen: seenAt })
        .getCount();
    }
    return { newReplyCount, weekPostCount };
  }

  async markFeedSeen(user: AuthUser) {
    let row = await this.readerState.findOne({ where: { userId: user.id } });
    if (!row) {
      row = this.readerState.create({
        userId: user.id,
        feedSeenAt: new Date(),
      });
    } else {
      row.feedSeenAt = new Date();
    }
    await this.readerState.save(row);
    return { ok: true, feedSeenAt: row.feedSeenAt };
  }
}
