import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('journal_posts')
export class JournalPost {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({ name: 'author_id', type: 'int' })
  authorId: number;

  @Column({ type: 'varchar', length: 80, nullable: true })
  title: string | null;

  @Column({ type: 'text' })
  body: string;

  @Column({ name: 'mood_tag', type: 'varchar', length: 16, nullable: true })
  moodTag: string | null;

  /** family = 全家可见；parents = 仅家长 */
  @Column({ type: 'varchar', length: 16, default: 'family' })
  visibility: 'family' | 'parents';

  @Column({ type: 'varchar', length: 16, default: 'active' })
  status: 'active' | 'deleted';

  @Column({ name: 'source_private_diary_id', type: 'int', nullable: true })
  sourcePrivateDiaryId: number | null;

  /** 配图路径列表，最多 3 张（存 /uploads/...） */
  @Column({ name: 'image_urls', type: 'simple-json', nullable: true })
  imageUrls: string[] | null;

  @Index()
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

@Entity('journal_comments')
export class JournalComment {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({ name: 'post_id', type: 'int' })
  postId: number;

  @Column({ name: 'author_id', type: 'int' })
  authorId: number;

  @Column({ type: 'varchar', length: 400 })
  body: string;

  /** P1 二级跟帖：仅允许一层 */
  @Column({ name: 'parent_comment_id', type: 'int', nullable: true })
  parentCommentId: number | null;

  @Column({ type: 'varchar', length: 16, default: 'active' })
  status: 'active' | 'deleted';

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

@Entity('private_diary_entries')
export class PrivateDiaryEntry {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({ name: 'student_id', type: 'int' })
  studentId: number;

  @Column({ type: 'text' })
  body: string;

  @Column({ name: 'mood_tag', type: 'varchar', length: 16, nullable: true })
  moodTag: string | null;

  @Column({ type: 'varchar', length: 16, default: 'active' })
  status: 'active' | 'deleted';

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

@Entity('journal_student_prefs')
export class JournalStudentPrefs {
  @Column({ name: 'student_id', type: 'int', primary: true })
  studentId: number;

  @Column({ name: 'private_diary_enabled', type: 'boolean', default: false })
  privateDiaryEnabled: boolean;

  @Column({ name: 'private_diary_enabled_at', type: 'datetime', nullable: true })
  privateDiaryEnabledAt: Date | null;
}

/** 家庭手账时间线已读游标（轻未读） */
@Entity('journal_reader_state')
export class JournalReaderState {
  @Column({ name: 'user_id', type: 'int', primary: true })
  userId: number;

  @Column({ name: 'feed_seen_at', type: 'datetime', nullable: true })
  feedSeenAt: Date | null;
}

/** 按用户的说说通知偏好（与私密日记 prefs 解耦） */
@Entity('journal_user_prefs')
export class JournalUserPrefs {
  @Column({ name: 'user_id', type: 'int', primary: true })
  userId: number;

  /** 他人回应我的帖时是否 Push；默认开 */
  @Column({ name: 'comment_push_enabled', type: 'boolean', default: true })
  commentPushEnabled: boolean;
}
