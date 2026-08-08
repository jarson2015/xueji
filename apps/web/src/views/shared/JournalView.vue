<template>
  <div class="page">
    <PageSkeleton v-if="loading" :rows="5" />
    <template v-else>
      <div class="page-head">
        <div>
          <h2 class="page-title" style="margin: 0">
            {{ productName }}
          </h2>
          <p class="muted lead">{{ pageLead }}</p>
        </div>
        <el-button type="primary" class="tap-btn" @click="openComposer">写一条</el-button>
      </div>

      <div class="card-panel notify-prefs">
        <div class="notify-row">
          <div>
            <strong>新回应提醒</strong>
            <p class="muted tiny" style="margin: 4px 0 0">
              有人接话时，若已开浏览器通知，可离屏提醒。关掉只影响说说，不影响打卡等其它提醒。
            </p>
          </div>
          <el-switch
            v-model="commentPushEnabled"
            :loading="notifyBusy"
            @change="saveNotifyPrefs"
          />
        </div>
      </div>

      <EmptyState
        v-if="!posts.length"
        hero
        :title="emptyTitle"
        description="写一条今天的小事或心情，家人可以回应。"
        action-label="写第一条"
        @action="openComposer"
      />

      <div v-for="p in posts" :key="p.id" class="card-panel post-card">
        <div class="post-meta">
          <strong>{{ p.authorName }}</strong>
          <span class="muted tiny">{{ formatTime(p.createdAt) }}</span>
          <el-tag v-if="p.visibility === 'parents'" size="small" effect="plain">仅家长</el-tag>
          <el-tag v-if="p.sourcePrivateDiaryId" size="small" type="info" effect="plain">
            来自分享
          </el-tag>
        </div>
        <p v-if="moodLabel(p.moodTag)" class="mood-line">{{ moodLabel(p.moodTag) }}</p>
        <p v-if="p.body" class="post-body">{{ p.body }}</p>
        <div v-if="p.imageUrls?.length" class="post-images">
          <img
            v-for="(u, i) in p.imageUrls"
            :key="i"
            :src="u"
            alt=""
            class="post-img"
          />
        </div>

        <!-- UJ：BBS 式楼层（列表内嵌） -->
        <div class="thread" :aria-label="`回应 ${p.commentCount || 0} 条`">
          <div
            v-for="(c, idx) in visibleRoots(p)"
            :key="c.id"
            class="floor"
          >
            <div class="floor-head">
              <span class="floor-no">#{{ idx + 1 }}</span>
              <strong>{{ c.authorName }}</strong>
              <span class="muted tiny">{{ formatTime(c.createdAt) }}</span>
              <div class="floor-actions">
                <el-button text type="primary" class="tap-btn" @click="startInlineReply(p, c)">
                  接话
                </el-button>
                <el-button
                  v-if="canDeleteComment(c)"
                  text
                  type="danger"
                  class="tap-btn"
                  @click="askDeleteComment(c, p)"
                >
                  删除
                </el-button>
              </div>
            </div>
            <p class="floor-body">{{ c.body }}</p>
            <div
              v-for="r in c.replies || []"
              :key="r.id"
              class="floor-reply"
            >
              <div class="floor-head">
                <strong>{{ r.authorName }}</strong>
                <span class="muted tiny">{{ formatTime(r.createdAt) }}</span>
                <div class="floor-actions">
                  <el-button
                    v-if="canDeleteComment(r)"
                    text
                    type="danger"
                    class="tap-btn"
                    @click="askDeleteComment(r, p)"
                  >
                    删除
                  </el-button>
                </div>
              </div>
              <p class="floor-body">{{ r.body }}</p>
            </div>
          </div>

          <button
            v-if="canExpandThread(p)"
            type="button"
            class="thread-more"
            :disabled="threadLoadingId === p.id"
            @click="expandThread(p)"
          >
            {{
              threadLoadingId === p.id
                ? '加载中…'
                : `展开全部回应（${p.commentCount}）`
            }}
          </button>
          <button
            v-else-if="isThreadExpanded(p)"
            type="button"
            class="thread-more"
            @click="collapseThread(p)"
          >
            收起回应
          </button>

          <div
            v-if="!visibleRoots(p).length && !(p.commentCount > 0)"
            class="thread-empty muted tiny"
          >
            还没有回应，做第一个接话的人吧。
          </div>

          <div class="inline-compose">
            <p v-if="inlineReply.postId === p.id && inlineReply.parentId" class="reply-hint muted tiny">
              回复 {{ inlineReply.parentName }}
              <el-button text type="primary" class="tap-btn" @click="clearInlineReply">
                取消
              </el-button>
            </p>
            <div class="prompt-row inline-prompts">
              <button
                v-for="t in commentPrompts"
                :key="t"
                type="button"
                class="prompt-chip"
                @click="applyInlinePrompt(p, t)"
              >
                {{ t }}
              </button>
            </div>
            <el-input
              :model-value="inlineBodyFor(p.id)"
              type="textarea"
              :rows="2"
              maxlength="200"
              show-word-limit
              :placeholder="
                inlineReply.postId === p.id && inlineReply.parentId
                  ? `回复 ${inlineReply.parentName}…`
                  : '写一句回应…'
              "
              @update:model-value="setInlineBody(p.id, $event)"
            />
            <div class="inline-compose-actions">
              <el-button
                type="primary"
                class="tap-btn"
                :loading="inlineBusyId === p.id"
                :disabled="!inlineBodyFor(p.id).trim()"
                @click="submitInlineComment(p)"
              >
                发送回应
              </el-button>
              <el-button text type="primary" class="tap-btn" @click="openDetail(p)">
                专注写回应
              </el-button>
            </div>
          </div>
        </div>

        <div class="post-actions">
          <el-button
            v-if="p.canEdit"
            text
            type="primary"
            class="tap-btn"
            @click="openEditPost(p)"
          >
            编辑
          </el-button>
          <el-button
            v-if="canDeletePost(p)"
            text
            type="danger"
            class="tap-btn"
            @click="askDeletePost(p)"
          >
            删除
          </el-button>
        </div>
      </div>

      <div v-if="posts.length && hasMore" class="more-wrap">
        <el-button class="tap-btn" :loading="loadingMore" @click="loadMore">
          加载更多
        </el-button>
      </div>

      <el-collapse
        v-if="isStudent && !isProxy"
        v-model="diaryFold"
        class="diary-fold"
      >
        <el-collapse-item name="diary">
          <template #title>
            <span>{{ privateName }}</span>
          </template>

          <!-- 关闭 / 未开启：只读保留 + 自愿开启 -->
          <template v-if="diaryClosed">
            <p v-if="!diaries.length" class="muted">
              默认关闭。开启后只有你能看，家长看不到原文。
            </p>
            <p v-else class="muted tiny closed-hint">已关闭 · 只读保留</p>
            <div v-for="d in diaries" :key="d.id" class="diary-row">
              <p>{{ d.body }}</p>
              <div class="muted tiny">{{ formatTime(d.createdAt) }}</div>
            </div>
            <el-button type="primary" class="tap-btn" @click="enablePrompt = true">
              自愿开启
            </el-button>
          </template>

          <!-- 已开启：可写、可分享/删/编辑，可关闭 -->
          <template v-else>
            <div class="composer-inline">
              <el-input
                v-model="diaryForm.body"
                type="textarea"
                :rows="3"
                maxlength="500"
                show-word-limit
                placeholder="写给自己的话…"
              />
              <div class="mood-row">
                <button
                  v-for="m in moodOptions"
                  :key="m.tag"
                  type="button"
                  class="mood-chip"
                  :class="{ on: diaryForm.moodTag === m.tag }"
                  @click="toggleDiaryMood(m.tag)"
                >
                  {{ m.emoji }} {{ m.label }}
                </button>
              </div>
              <el-button
                type="primary"
                class="tap-btn"
                :loading="diaryBusy"
                :disabled="!diaryForm.body.trim()"
                @click="saveDiary"
              >
                保存{{ privateShort }}
              </el-button>
            </div>
            <div v-for="d in diaries" :key="d.id" class="diary-row">
              <p>{{ d.body }}</p>
              <div class="muted tiny">{{ formatTime(d.createdAt) }}</div>
              <div class="post-actions">
                <el-button
                  v-if="d.canEdit"
                  text
                  type="primary"
                  class="tap-btn"
                  @click="openEditDiary(d)"
                >
                  编辑
                </el-button>
                <el-button text type="primary" class="tap-btn" @click="startShare(d)">
                  {{ shareAction }}
                </el-button>
                <el-button
                  text
                  type="danger"
                  class="tap-btn"
                  @click="askDeleteDiary(d)"
                >
                  删除
                </el-button>
              </div>
            </div>
            <p v-if="!diaries.length" class="muted">还没有{{ privateShort }}</p>
            <el-button class="tap-btn close-diary-btn" @click="closePrompt = true">
              关闭{{ privateShort }}
            </el-button>
          </template>
        </el-collapse-item>
      </el-collapse>
      <p v-else-if="isStudent && isProxy" class="muted proxy-hint proxy-hint-strong">
        {{ privateShort }}仅本人可见，代登时不可使用。代登家长无法打开或代写私密内容。
      </p>
    </template>

    <!-- 发帖 -->
    <el-drawer v-model="composerOpen" :title="composeTitle" size="auto" direction="btt">
      <div class="drawer-body">
        <p v-if="isProxy" class="muted tiny proxy-compose-banner">{{ proxyHint }}</p>
        <div class="prompt-row">
          <button
            v-for="t in postPrompts"
            :key="t"
            type="button"
            class="prompt-chip"
            @click="applyPromptToPost(t)"
          >
            {{ t }}
          </button>
        </div>
        <el-input
          v-model="postForm.body"
          type="textarea"
          :rows="4"
          maxlength="500"
          show-word-limit
          placeholder="今天想和家人说的…"
        />
        <div class="img-upload-row">
          <el-upload
            v-if="postForm.imageUrls.length < 3"
            :show-file-list="false"
            :disabled="uploadingPostImage"
            accept="image/jpeg,image/png,image/webp,image/gif"
            :http-request="uploadPostImage"
          >
            <el-button class="tap-btn" :loading="uploadingPostImage">添加图片</el-button>
          </el-upload>
          <span class="muted tiny">最多 3 张</span>
        </div>
        <div v-if="postForm.imagePreviews.length" class="post-images">
          <div
            v-for="(u, i) in postForm.imagePreviews"
            :key="i"
            class="img-thumb-wrap"
          >
            <img :src="u" alt="" class="post-img" />
            <el-button text type="danger" class="tap-btn" @click="removePostImage(i)">
              移除
            </el-button>
          </div>
        </div>
        <div class="mood-row">
          <button
            v-for="m in moodOptions"
            :key="m.tag"
            type="button"
            class="mood-chip"
            :class="{ on: postForm.moodTag === m.tag }"
            @click="togglePostMood(m.tag)"
          >
            {{ m.emoji }} {{ m.label }}
          </button>
        </div>
        <div class="vis-row">
          <span class="muted">谁能看</span>
          <el-radio-group v-model="postForm.visibility">
            <el-radio-button value="family">全家</el-radio-button>
            <el-radio-button value="parents">仅家长</el-radio-button>
          </el-radio-group>
        </div>
        <el-button
          type="primary"
          class="tap-btn full"
          :loading="postBusy"
          :disabled="!canPublishPost"
          @click="submitPost"
        >
          发布
        </el-button>
      </div>
    </el-drawer>

    <!-- 编辑帖子 -->
    <el-drawer v-model="editPostOpen" title="编辑手账" size="auto" direction="btt">
      <div class="drawer-body">
        <div class="prompt-row">
          <button
            v-for="t in postPrompts"
            :key="t"
            type="button"
            class="prompt-chip"
            @click="applyPromptToEditPost(t)"
          >
            {{ t }}
          </button>
        </div>
        <el-input
          v-model="editPostForm.body"
          type="textarea"
          :rows="4"
          maxlength="500"
          show-word-limit
          placeholder="今天想和家人说的…"
        />
        <div class="img-upload-row">
          <el-upload
            v-if="editPostForm.imageUrls.length < 3"
            :show-file-list="false"
            :disabled="uploadingEditImage"
            accept="image/jpeg,image/png,image/webp,image/gif"
            :http-request="uploadEditPostImage"
          >
            <el-button class="tap-btn" :loading="uploadingEditImage">添加图片</el-button>
          </el-upload>
          <span class="muted tiny">最多 3 张</span>
        </div>
        <div v-if="editPostForm.imagePreviews.length" class="post-images">
          <div
            v-for="(u, i) in editPostForm.imagePreviews"
            :key="i"
            class="img-thumb-wrap"
          >
            <img :src="u" alt="" class="post-img" />
            <el-button text type="danger" class="tap-btn" @click="removeEditPostImage(i)">
              移除
            </el-button>
          </div>
        </div>
        <div class="mood-row">
          <button
            v-for="m in moodOptions"
            :key="m.tag"
            type="button"
            class="mood-chip"
            :class="{ on: editPostForm.moodTag === m.tag }"
            @click="toggleEditPostMood(m.tag)"
          >
            {{ m.emoji }} {{ m.label }}
          </button>
        </div>
        <div class="vis-row">
          <span class="muted">谁能看</span>
          <el-radio-group v-model="editPostForm.visibility">
            <el-radio-button value="family">全家</el-radio-button>
            <el-radio-button value="parents">仅家长</el-radio-button>
          </el-radio-group>
        </div>
        <el-button
          type="primary"
          class="tap-btn full"
          :loading="editPostBusy"
          :disabled="!canSaveEditPost"
          @click="submitEditPost"
        >
          保存修改
        </el-button>
      </div>
    </el-drawer>

    <!-- 编辑私密区 -->
    <el-drawer
      v-model="editDiaryOpen"
      :title="`编辑${privateShort}`"
      size="auto"
      direction="btt"
    >
      <div class="drawer-body">
        <el-input
          v-model="editDiaryForm.body"
          type="textarea"
          :rows="4"
          maxlength="500"
          show-word-limit
          placeholder="写给自己的话…"
        />
        <div class="mood-row">
          <button
            v-for="m in moodOptions"
            :key="m.tag"
            type="button"
            class="mood-chip"
            :class="{ on: editDiaryForm.moodTag === m.tag }"
            @click="toggleEditDiaryMood(m.tag)"
          >
            {{ m.emoji }} {{ m.label }}
          </button>
        </div>
        <el-button
          type="primary"
          class="tap-btn full"
          :loading="editDiaryBusy"
          :disabled="!editDiaryForm.body.trim()"
          @click="submitEditDiary"
        >
          保存修改
        </el-button>
      </div>
    </el-drawer>

    <!-- 可选：专注回应（列表已可内嵌接话） -->
    <el-drawer v-model="detailOpen" title="专注回应" size="auto" direction="btt">
      <div v-if="activePost" class="drawer-body">
        <p class="muted tiny" style="margin: 0 0 8px">
          也可在时间线帖子下方直接接话。
        </p>
        <p v-if="activePost.body" class="post-body">{{ activePost.body }}</p>
        <div v-if="activePost.imageUrls?.length" class="post-images">
          <img
            v-for="(u, i) in activePost.imageUrls"
            :key="i"
            :src="u"
            alt=""
            class="post-img"
          />
        </div>
        <div v-for="c in comments" :key="c.id" class="comment-row">
          <div class="comment-head">
            <strong>{{ c.authorName }}</strong>
            <div class="comment-actions">
              <el-button text type="primary" class="tap-btn" @click="startReply(c)">
                接话
              </el-button>
              <el-button
                v-if="canDeleteComment(c)"
                text
                type="danger"
                class="tap-btn"
                @click="askDeleteComment(c)"
              >
                删除
              </el-button>
            </div>
          </div>
          <span>{{ c.body }}</span>
          <span class="muted tiny">{{ formatTime(c.createdAt) }}</span>
          <div
            v-for="r in c.replies || []"
            :key="r.id"
            class="comment-reply"
          >
            <div class="comment-head">
              <strong>{{ r.authorName }}</strong>
              <el-button
                v-if="canDeleteComment(r)"
                text
                type="danger"
                class="tap-btn"
                @click="askDeleteComment(r)"
              >
                删除
              </el-button>
            </div>
            <span>{{ r.body }}</span>
            <span class="muted tiny">{{ formatTime(r.createdAt) }}</span>
          </div>
        </div>
        <div class="prompt-row">
          <button
            v-for="t in commentPrompts"
            :key="t"
            type="button"
            class="prompt-chip"
            @click="applyPromptToComment(t)"
          >
            {{ t }}
          </button>
        </div>
        <p v-if="replyToId" class="reply-hint muted tiny">
          回复 {{ replyToName }}
          <el-button text type="primary" class="tap-btn" @click="clearReplyTo">
            取消
          </el-button>
        </p>
        <el-input
          v-model="commentBody"
          type="textarea"
          :rows="2"
          maxlength="200"
          show-word-limit
          :placeholder="replyPlaceholder"
        />
        <el-button
          type="primary"
          class="tap-btn"
          :loading="commentBusy"
          :disabled="!commentBody.trim()"
          @click="submitComment"
        >
          发送回应
        </el-button>
      </div>
    </el-drawer>

    <el-drawer
      v-model="shareConfirmOpen"
      :title="`确认发布到${productName}`"
      size="auto"
      direction="btt"
    >
      <div class="drawer-body">
        <p class="muted">
          将直接发一条副本，不经过剪贴板。原{{ privateShort }}仍只有你能看。
        </p>
        <div class="vis-row">
          <span class="muted">谁能看</span>
          <el-radio-group v-model="shareVisibility">
            <el-radio-button value="family">全家</el-radio-button>
            <el-radio-button value="parents">仅家长</el-radio-button>
          </el-radio-group>
        </div>
        <el-button
          type="primary"
          class="tap-btn full"
          :loading="shareBusy"
          @click="confirmShare(false)"
        >
          确认发布
        </el-button>
      </div>
    </el-drawer>

    <SoftPrompt
      v-model="enablePrompt"
      :title="enableCopy.title"
      :message="enableCopy.message"
      :confirm-text="enableCopy.confirmText"
      :cancel-text="enableCopy.cancelText"
      :show-input="false"
      kid-mode
      @confirm="confirmEnableDiary"
    />
    <SoftPrompt
      v-model="closePrompt"
      :title="closeCopy.title"
      :message="closeCopy.message"
      :confirm-text="closeCopy.confirmText"
      :cancel-text="closeCopy.cancelText"
      :show-input="false"
      kid-mode
      @confirm="confirmCloseDiary"
    />
    <SoftPrompt
      v-model="deletePrompt.open"
      :title="deleteCopy.title"
      :message="deleteCopy.message"
      :confirm-text="deleteCopy.confirmText"
      :cancel-text="deleteCopy.cancelText"
      :show-input="false"
      @confirm="confirmDeletePost"
    />
    <SoftPrompt
      v-model="deleteDiaryPrompt.open"
      :title="deleteDiaryCopy.title"
      :message="deleteDiaryCopy.message"
      :confirm-text="deleteDiaryCopy.confirmText"
      :cancel-text="deleteDiaryCopy.cancelText"
      :show-input="false"
      kid-mode
      @confirm="confirmDeleteDiary"
    />
    <SoftPrompt
      v-model="deleteCommentPrompt.open"
      :title="deleteCommentCopy.title"
      :message="deleteCommentCopy.message"
      :confirm-text="deleteCommentCopy.confirmText"
      :cancel-text="deleteCommentCopy.cancelText"
      :show-input="false"
      @confirm="confirmDeleteComment"
    />
    <SoftPrompt
      v-model="shareL1.open"
      :title="shareL1Copy.title"
      :message="shareL1Copy.message"
      :confirm-text="shareL1Copy.confirmText"
      :cancel-text="shareL1Copy.cancelText"
      :show-input="false"
      kid-mode
      @confirm="onShareLayer1Next"
    />
    <SoftPrompt
      v-model="shareForce.open"
      :title="shareForceCopy.title"
      :message="shareForceCopy.message"
      :confirm-text="shareForceCopy.confirmText"
      :cancel-text="shareForceCopy.cancelText"
      :show-input="false"
      kid-mode
      @confirm="confirmShare(true)"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onActivated, onMounted, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import http from '../../api/http'
import SoftPrompt from '../../components/SoftPrompt.vue'
import PageSkeleton from '../../components/PageSkeleton.vue'
import EmptyState from '../../components/EmptyState.vue'
import {
  journalComposeTitle,
  journalEmptyTitle,
  journalLead,
  journalPrivateName,
  journalProductName,
  journalShareAction,
} from '../../composables/journalLabels'
import { MOOD_OPTIONS } from '../../composables/eduMood'
import { useAuthStore } from '../../stores/auth'
import { friendlyError } from '../../composables/useOnboarding'
import {
  JOURNAL_POST_PROMPTS,
  buildClosePrivateDiaryCopy,
  buildDeleteCommentCopy,
  buildDeleteDiaryCopy,
  buildDeletePostCopy,
  buildEnablePrivateDiaryCopy,
  buildProxyComposeHint,
  buildShareForceCopy,
  buildShareLayer1Copy,
  journalCommentPromptsForRole,
} from '../../composables/journalSoftCopy'
import type { EmotionFunctionKind } from '../../composables/emotionFunctionHint'

defineOptions({ name: 'FamilyJournalView' })

const PAGE_SIZE = 30

const route = useRoute()
const auth = useAuthStore()
const isStudent = computed(() => route.path.startsWith('/student'))
const isProxy = computed(() => auth.isParentProxy())

/** 学生读 localStorage；家长固定 general → 家庭说说 */
const ageBand = computed(() => {
  if (!isStudent.value) return 'general'
  return localStorage.getItem('ageBand') || 'general'
})
const proxyHint = computed(() => buildProxyComposeHint(ageBand.value))
const productName = computed(() => journalProductName(ageBand.value))
const privateName = computed(() => journalPrivateName(ageBand.value))
const privateShort = computed(() =>
  ageBand.value === 'young' ? '悄悄话' : '私密日记',
)
const pageLead = computed(() => journalLead(ageBand.value))
const emptyTitle = computed(() => journalEmptyTitle(ageBand.value))
const composeTitle = computed(() => journalComposeTitle(ageBand.value))
const shareAction = computed(() => journalShareAction(ageBand.value))

const loading = ref(true)
const loadingMore = ref(false)
const hasMore = ref(false)
const posts = ref<any[]>([])
const commentPushEnabled = ref(true)
const notifyBusy = ref(false)
const prefs = reactive({ privateDiaryEnabled: false })
const diaryReadonly = ref(true)
const diaries = ref<any[]>([])
const diaryFold = ref<string[]>([])

/** 关闭或未开启：只读 + 自愿开启 */
const diaryClosed = computed(
  () => diaryReadonly.value || !prefs.privateDiaryEnabled,
)

const composerOpen = ref(false)
const postBusy = ref(false)
const uploadingPostImage = ref(false)
const postForm = reactive({
  body: '',
  moodTag: '' as string,
  visibility: 'family' as 'family' | 'parents',
  imageUrls: [] as string[],
  imagePreviews: [] as string[],
})
const canPublishPost = computed(
  () => !!postForm.body.trim() || postForm.imageUrls.length > 0,
)

const editPostOpen = ref(false)
const editPostBusy = ref(false)
const uploadingEditImage = ref(false)
const editPostId = ref(0)
const editPostForm = reactive({
  body: '',
  moodTag: '' as string,
  visibility: 'family' as 'family' | 'parents',
  imageUrls: [] as string[],
  imagePreviews: [] as string[],
})
const canSaveEditPost = computed(
  () => !!editPostForm.body.trim() || editPostForm.imageUrls.length > 0,
)

const editDiaryOpen = ref(false)
const editDiaryBusy = ref(false)
const editDiaryId = ref(0)
const editDiaryForm = reactive({ body: '', moodTag: '' as string })

const detailOpen = ref(false)
const activePost = ref<any>(null)
const comments = ref<any[]>([])
const commentBody = ref('')
const commentBusy = ref(false)
const replyToId = ref<number | null>(null)
const replyToName = ref('')
const replyPlaceholder = computed(() =>
  replyToId.value ? `回复 ${replyToName.value}…` : '写一句回应…',
)

/** UJ：列表预览主评条数（与 API preview 一致） */
const PREVIEW_ROOT = 5
const expandedIds = ref(new Set<number>())
const fullThreads = reactive<Record<number, any[]>>({})
const threadLoadingId = ref<number | null>(null)
const inlineBodies = reactive<Record<number, string>>({})
const inlineBusyId = ref<number | null>(null)
const inlineReply = reactive({
  postId: null as number | null,
  parentId: null as number | null,
  parentName: '',
})

function previewTotalCount(p: any) {
  const roots = Array.isArray(p.previewComments) ? p.previewComments : []
  return roots.reduce(
    (n: number, c: any) => n + 1 + (Array.isArray(c.replies) ? c.replies.length : 0),
    0,
  )
}

function visibleRoots(p: any) {
  if (expandedIds.value.has(p.id) && fullThreads[p.id]) {
    return fullThreads[p.id]
  }
  return Array.isArray(p.previewComments) ? p.previewComments : []
}

function canExpandThread(p: any) {
  if (expandedIds.value.has(p.id)) return false
  return (p.commentCount || 0) > previewTotalCount(p)
}

function isThreadExpanded(p: any) {
  return expandedIds.value.has(p.id)
}

async function expandThread(p: any) {
  threadLoadingId.value = p.id
  try {
    const data = (await http.get(`/journal/posts/${p.id}/comments`)) as any[]
    fullThreads[p.id] = Array.isArray(data) ? data : []
    const next = new Set(expandedIds.value)
    next.add(p.id)
    expandedIds.value = next
  } catch (err: any) {
    ElMessage.error(friendlyError(err, '加载回应失败'))
  } finally {
    threadLoadingId.value = null
  }
}

function collapseThread(p: any) {
  const next = new Set(expandedIds.value)
  next.delete(p.id)
  expandedIds.value = next
}

function inlineBodyFor(postId: number) {
  return inlineBodies[postId] || ''
}

function setInlineBody(postId: number, v: string | number) {
  inlineBodies[postId] = String(v ?? '')
}

function startInlineReply(p: any, c: any) {
  inlineReply.postId = p.id
  inlineReply.parentId = c.id
  inlineReply.parentName = c.authorName || ''
}

function clearInlineReply() {
  inlineReply.postId = null
  inlineReply.parentId = null
  inlineReply.parentName = ''
}

function applyInlinePrompt(p: any, t: string) {
  inlineBodies[p.id] = applyTextPrompt(inlineBodies[p.id] || '', t)
}

async function refreshExpandedThread(postId: number) {
  if (!expandedIds.value.has(postId)) return
  try {
    const data = (await http.get(`/journal/posts/${postId}/comments`)) as any[]
    fullThreads[postId] = Array.isArray(data) ? data : []
  } catch {
    /* 列表已刷新即可 */
  }
}

async function submitInlineComment(p: any) {
  const body = inlineBodyFor(p.id).trim()
  if (!body) return
  inlineBusyId.value = p.id
  try {
    const payload: { body: string; parentCommentId?: number } = { body }
    if (inlineReply.postId === p.id && inlineReply.parentId) {
      payload.parentCommentId = inlineReply.parentId
    }
    await http.post(`/journal/posts/${p.id}/comments`, payload)
    inlineBodies[p.id] = ''
    clearInlineReply()
    ElMessage.success('已发送')
    await loadPosts()
    await refreshExpandedThread(p.id)
    if (detailOpen.value && activePost.value?.id === p.id) {
      const data = (await http.get(`/journal/posts/${p.id}/comments`)) as any[]
      comments.value = Array.isArray(data) ? data : []
    }
  } catch (err: any) {
    ElMessage.error(friendlyError(err, '发送失败'))
  } finally {
    inlineBusyId.value = null
  }
}

const diaryForm = reactive({ body: '', moodTag: '' as string })
const diaryBusy = ref(false)

const enablePrompt = ref(false)
const enableCopy = computed(() => buildEnablePrivateDiaryCopy(ageBand.value))
const closePrompt = ref(false)
const closeCopy = computed(() => buildClosePrivateDiaryCopy(ageBand.value))

const deletePrompt = reactive({
  open: false,
  id: 0 as number,
  preview: '',
  deletingOthers: false,
})
const deleteCopy = computed(() =>
  buildDeletePostCopy(deletePrompt.preview, {
    deletingOthers: deletePrompt.deletingOthers,
    ageBand: ageBand.value,
  }),
)

const deleteDiaryPrompt = reactive({
  open: false,
  id: 0 as number,
  preview: '',
})
const deleteDiaryCopy = computed(() =>
  buildDeleteDiaryCopy(deleteDiaryPrompt.preview, ageBand.value),
)

const deleteCommentPrompt = reactive({
  open: false,
  id: 0 as number,
  postId: 0 as number,
})
const deleteCommentCopy = buildDeleteCommentCopy()

const shareL1 = reactive({ open: false, diary: null as any })
const shareL1Copy = computed(() =>
  buildShareLayer1Copy(shareL1.diary?.body || '', { ageBand: ageBand.value }),
)
const shareConfirmOpen = ref(false)
const shareVisibility = ref<'family' | 'parents'>('family')
const shareBusy = ref(false)
const shareForce = reactive({ open: false, diary: null as any })
const shareForceCopy = computed(() =>
  buildShareForceCopy({ ageBand: ageBand.value }),
)
const pendingShareDiary = ref<any>(null)

const moodOptions = MOOD_OPTIONS
const postPrompts = JOURNAL_POST_PROMPTS
const commentPrompts = computed(() => {
  let kind: EmotionFunctionKind | null = null
  try {
    const raw = localStorage.getItem('xueji_emotion_fn_kind')
    if (
      raw === 'exhaustion' ||
      raw === 'competence_threat' ||
      raw === 'relation_threat' ||
      raw === 'meaning_gap'
    ) {
      kind = raw
    }
  } catch {
    /* ignore */
  }
  return journalCommentPromptsForRole(auth.user?.role, kind)
})

function moodLabel(tag?: string | null) {
  if (!tag) return ''
  const m = MOOD_OPTIONS.find((x) => x.tag === tag)
  return m ? `${m.emoji} ${m.label}` : ''
}

function formatTime(v: string | Date) {
  if (!v) return ''
  const d = new Date(v)
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/** Persist `/uploads/...` path; strip signed query if needed. */
function toUploadPath(raw: string): string {
  const s = String(raw || '').trim()
  if (!s) return ''
  try {
    if (/^https?:\/\//i.test(s)) {
      const u = new URL(s)
      return u.pathname.split('#')[0]
    }
  } catch {
    /* fall through */
  }
  return s.split('?')[0].split('#')[0]
}

function fromUploadResponse(res: any): { path: string; preview: string } {
  const path = res?.path
    ? String(res.path)
    : toUploadPath(String(res?.url || ''))
  const preview = String(res?.url || path)
  return { path, preview }
}

async function uploadToServer(file: File) {
  const fd = new FormData()
  fd.append('file', file)
  const res: any = await http.post('/uploads', fd)
  return fromUploadResponse(res)
}

async function uploadPostImage(option: any) {
  if (postForm.imageUrls.length >= 3) return
  uploadingPostImage.value = true
  try {
    const { path, preview } = await uploadToServer(option.file as File)
    if (!path) throw new Error('上传结果无效')
    postForm.imageUrls.push(path)
    postForm.imagePreviews.push(preview)
  } catch (err: any) {
    ElMessage.error(friendlyError(err, '图片上传失败'))
  } finally {
    uploadingPostImage.value = false
  }
}

function removePostImage(i: number) {
  postForm.imageUrls.splice(i, 1)
  postForm.imagePreviews.splice(i, 1)
}

async function uploadEditPostImage(option: any) {
  if (editPostForm.imageUrls.length >= 3) return
  uploadingEditImage.value = true
  try {
    const { path, preview } = await uploadToServer(option.file as File)
    if (!path) throw new Error('上传结果无效')
    editPostForm.imageUrls.push(path)
    editPostForm.imagePreviews.push(preview)
  } catch (err: any) {
    ElMessage.error(friendlyError(err, '图片上传失败'))
  } finally {
    uploadingEditImage.value = false
  }
}

function removeEditPostImage(i: number) {
  editPostForm.imageUrls.splice(i, 1)
  editPostForm.imagePreviews.splice(i, 1)
}

/** 空或接近空时替换；已有内容则追加 */
function applyTextPrompt(current: string, prompt: string) {
  const cur = current.trim()
  if (!cur) return prompt
  const sep = current.endsWith('\n') || current.endsWith(' ') ? '' : ' '
  return `${current}${sep}${prompt}`
}

function applyPromptToPost(t: string) {
  postForm.body = applyTextPrompt(postForm.body, t)
}
function applyPromptToEditPost(t: string) {
  editPostForm.body = applyTextPrompt(editPostForm.body, t)
}
function applyPromptToComment(t: string) {
  commentBody.value = applyTextPrompt(commentBody.value, t)
}

function canDeletePost(p: any) {
  if (!auth.user) return false
  return p.authorId === auth.user.id || auth.user.role === 'parent'
}

function canDeleteComment(c: any) {
  if (!auth.user) return false
  return c.authorId === auth.user.id || auth.user.role === 'parent'
}

function togglePostMood(tag: string) {
  postForm.moodTag = postForm.moodTag === tag ? '' : tag
}
function toggleEditPostMood(tag: string) {
  editPostForm.moodTag = editPostForm.moodTag === tag ? '' : tag
}
function toggleDiaryMood(tag: string) {
  diaryForm.moodTag = diaryForm.moodTag === tag ? '' : tag
}
function toggleEditDiaryMood(tag: string) {
  editDiaryForm.moodTag = editDiaryForm.moodTag === tag ? '' : tag
}

function openComposer() {
  postForm.body = ''
  postForm.moodTag = ''
  postForm.visibility = 'family'
  postForm.imageUrls = []
  postForm.imagePreviews = []
  composerOpen.value = true
}

function openEditPost(p: any) {
  editPostId.value = p.id
  editPostForm.body = p.body || ''
  editPostForm.moodTag = p.moodTag || ''
  editPostForm.visibility = p.visibility === 'parents' ? 'parents' : 'family'
  const raw = Array.isArray(p.imageUrls) ? p.imageUrls : []
  editPostForm.imageUrls = raw.map((u: string) => toUploadPath(u)).filter(Boolean)
  editPostForm.imagePreviews = [...raw]
  editPostOpen.value = true
}

function openEditDiary(d: any) {
  editDiaryId.value = d.id
  editDiaryForm.body = d.body || ''
  editDiaryForm.moodTag = d.moodTag || ''
  editDiaryOpen.value = true
}

async function fetchPosts(beforeId?: number) {
  const q = beforeId
    ? `/journal/posts?limit=${PAGE_SIZE}&beforeId=${beforeId}`
    : `/journal/posts?limit=${PAGE_SIZE}`
  // http 拦截器已解包 {code:0,data}，此处直接得到数组
  const data = (await http.get(q)) as any[]
  return Array.isArray(data) ? data : []
}

async function loadPosts() {
  const data = await fetchPosts()
  posts.value = data
  hasMore.value = data.length >= PAGE_SIZE
  const expanded = [...expandedIds.value]
  if (expanded.length) {
    await Promise.all(expanded.map((id) => refreshExpandedThread(id)))
  }
}

async function loadMore() {
  if (!posts.value.length || loadingMore.value) return
  loadingMore.value = true
  try {
    const lastId = posts.value[posts.value.length - 1].id
    const more = await fetchPosts(lastId)
    posts.value = [...posts.value, ...more]
    hasMore.value = more.length >= PAGE_SIZE
  } catch (err: any) {
    ElMessage.error(friendlyError(err, '加载失败'))
  } finally {
    loadingMore.value = false
  }
}

async function loadDiaryArea() {
  if (!isStudent.value || isProxy.value) return
  try {
    // 关闭后仍返回 items，供只读展示
    const data: any = await http.get('/journal/private-diary')
    prefs.privateDiaryEnabled = !!data?.privateDiaryEnabled
    diaryReadonly.value = !!data?.readonly || !prefs.privateDiaryEnabled
    diaries.value = Array.isArray(data?.items) ? data.items : []
  } catch {
    /* 代登或权限不足 */
  }
}

function markSeen() {
  void http.post('/journal/mark-seen').catch(() => {})
}

async function loadNotifyPrefs() {
  try {
    const data: any = await http.get('/journal/notify-prefs')
    commentPushEnabled.value = data?.commentPushEnabled !== false
  } catch {
    commentPushEnabled.value = true
  }
}

async function saveNotifyPrefs(val: string | number | boolean) {
  notifyBusy.value = true
  try {
    const data: any = await http.patch('/journal/notify-prefs', {
      commentPushEnabled: !!val,
    })
    commentPushEnabled.value = data?.commentPushEnabled !== false
    ElMessage.success(
      commentPushEnabled.value ? '已开启新回应提醒' : '已关闭新回应提醒',
    )
  } catch (err: any) {
    commentPushEnabled.value = !val
    ElMessage.error(friendlyError(err, '保存提醒偏好失败'))
  } finally {
    notifyBusy.value = false
  }
}

async function load() {
  loading.value = true
  try {
    await Promise.all([loadPosts(), loadDiaryArea(), loadNotifyPrefs()])
    markSeen()
    await openDeepLinkPost()
  } catch (err: any) {
    ElMessage.error(friendlyError(err, '加载手账失败'))
  } finally {
    loading.value = false
  }
}

async function openDeepLinkPost() {
  const raw = route.query.postId
  const id = Number(Array.isArray(raw) ? raw[0] : raw)
  if (!id || Number.isNaN(id)) return
  try {
    let post = posts.value.find((p) => p.id === id)
    if (!post) {
      post = (await http.get(`/journal/posts/${id}`)) as any
    }
    if (post) await openDetail(post)
  } catch {
    /* 深链失败不挡主列表 */
  }
}

async function submitPost() {
  if (!canPublishPost.value) return
  postBusy.value = true
  try {
    await http.post('/journal/posts', {
      body: postForm.body.trim(),
      moodTag: postForm.moodTag || undefined,
      visibility: postForm.visibility,
      imageUrls: postForm.imageUrls,
    })
    composerOpen.value = false
    ElMessage.success('已发布')
    await loadPosts()
  } catch (err: any) {
    ElMessage.error(friendlyError(err, '发布失败'))
  } finally {
    postBusy.value = false
  }
}

async function submitEditPost() {
  if (!editPostId.value || !canSaveEditPost.value) return
  editPostBusy.value = true
  try {
    await http.patch(`/journal/posts/${editPostId.value}`, {
      body: editPostForm.body.trim(),
      moodTag: editPostForm.moodTag || undefined,
      visibility: editPostForm.visibility,
      imageUrls: editPostForm.imageUrls,
    })
    editPostOpen.value = false
    ElMessage.success('已保存')
    await loadPosts()
  } catch (err: any) {
    ElMessage.error(friendlyError(err, '保存失败'))
  } finally {
    editPostBusy.value = false
  }
}

function clearReplyTo() {
  replyToId.value = null
  replyToName.value = ''
}

function startReply(c: any) {
  replyToId.value = c.id
  replyToName.value = c.authorName || ''
}

async function openDetail(p: any) {
  activePost.value = p
  commentBody.value = ''
  clearReplyTo()
  detailOpen.value = true
  try {
    const data = (await http.get(`/journal/posts/${p.id}/comments`)) as any[]
    comments.value = Array.isArray(data) ? data : []
  } catch (err: any) {
    ElMessage.error(friendlyError(err, '加载回应失败'))
  }
}

async function submitComment() {
  if (!activePost.value) return
  commentBusy.value = true
  try {
    const payload: { body: string; parentCommentId?: number } = {
      body: commentBody.value.trim(),
    }
    if (replyToId.value) payload.parentCommentId = replyToId.value
    await http.post(`/journal/posts/${activePost.value.id}/comments`, payload)
    commentBody.value = ''
    clearReplyTo()
    const data = (await http.get(
      `/journal/posts/${activePost.value.id}/comments`,
    )) as any[]
    comments.value = Array.isArray(data) ? data : []
    await loadPosts()
    if (activePost.value?.id) {
      await refreshExpandedThread(activePost.value.id)
    }
  } catch (err: any) {
    ElMessage.error(friendlyError(err, '发送失败'))
  } finally {
    commentBusy.value = false
  }
}

function askDeletePost(p: any) {
  deletePrompt.id = p.id
  deletePrompt.preview = p.body
  deletePrompt.deletingOthers = !!(
    auth.user &&
    p.authorId !== auth.user.id &&
    auth.user.role === 'parent'
  )
  deletePrompt.open = true
}

async function confirmDeletePost() {
  try {
    await http.patch(`/journal/posts/${deletePrompt.id}/delete`)
    ElMessage.success('已删除')
    await loadPosts()
  } catch (err: any) {
    ElMessage.error(friendlyError(err, '删除失败'))
  }
}

function askDeleteComment(c: any, p?: any) {
  deleteCommentPrompt.id = c.id
  deleteCommentPrompt.postId = p?.id || activePost.value?.id || 0
  deleteCommentPrompt.open = true
}

async function confirmDeleteComment() {
  try {
    await http.patch(`/journal/comments/${deleteCommentPrompt.id}/delete`)
    ElMessage.success('已删除')
    const postId = deleteCommentPrompt.postId
    if (activePost.value && activePost.value.id === postId) {
      const data = (await http.get(
        `/journal/posts/${activePost.value.id}/comments`,
      )) as any[]
      comments.value = Array.isArray(data) ? data : []
    }
    await loadPosts()
    if (postId) await refreshExpandedThread(postId)
  } catch (err: any) {
    ElMessage.error(friendlyError(err, '删除失败'))
  }
}

async function confirmEnableDiary() {
  try {
    await http.patch('/journal/private-diary/prefs', {
      privateDiaryEnabled: true,
    })
    prefs.privateDiaryEnabled = true
    diaryReadonly.value = false
    diaryFold.value = ['diary']
    ElMessage.success(`已开启${privateShort.value}`)
    await loadDiaryArea()
  } catch (err: any) {
    ElMessage.error(friendlyError(err, '开启失败'))
  }
}

async function confirmCloseDiary() {
  try {
    await http.patch('/journal/private-diary/prefs', {
      privateDiaryEnabled: false,
    })
    prefs.privateDiaryEnabled = false
    diaryReadonly.value = true
    ElMessage.success(`已关闭${privateShort.value}`)
    await loadDiaryArea()
  } catch (err: any) {
    ElMessage.error(friendlyError(err, '关闭失败'))
  }
}

async function saveDiary() {
  diaryBusy.value = true
  try {
    await http.post('/journal/private-diary', {
      body: diaryForm.body.trim(),
      moodTag: diaryForm.moodTag || undefined,
    })
    diaryForm.body = ''
    diaryForm.moodTag = ''
    ElMessage.success('已保存')
    await loadDiaryArea()
  } catch (err: any) {
    ElMessage.error(friendlyError(err, '保存失败'))
  } finally {
    diaryBusy.value = false
  }
}

async function submitEditDiary() {
  if (!editDiaryId.value) return
  editDiaryBusy.value = true
  try {
    await http.patch(`/journal/private-diary/${editDiaryId.value}`, {
      body: editDiaryForm.body.trim(),
      moodTag: editDiaryForm.moodTag || undefined,
    })
    editDiaryOpen.value = false
    ElMessage.success('已保存')
    await loadDiaryArea()
  } catch (err: any) {
    ElMessage.error(friendlyError(err, '保存失败'))
  } finally {
    editDiaryBusy.value = false
  }
}

function askDeleteDiary(d: any) {
  deleteDiaryPrompt.id = d.id
  deleteDiaryPrompt.preview = d.body
  deleteDiaryPrompt.open = true
}

async function confirmDeleteDiary() {
  try {
    await http.patch(`/journal/private-diary/${deleteDiaryPrompt.id}/delete`)
    ElMessage.success('已删除')
    await loadDiaryArea()
  } catch (err: any) {
    ElMessage.error(friendlyError(err, '删除失败'))
  }
}

function startShare(d: any) {
  shareL1.diary = d
  pendingShareDiary.value = d
  shareVisibility.value = 'family'
  shareL1.open = true
}

function onShareLayer1Next() {
  shareConfirmOpen.value = true
}

function isAlreadySharedError(err: any) {
  const msg = String(err?.message || '')
  return msg.includes('已分享过') || msg.includes('409')
}

async function confirmShare(force: boolean) {
  const d = force ? shareForce.diary : pendingShareDiary.value
  if (!d) return
  shareBusy.value = true
  try {
    await http.post(`/journal/private-diary/${d.id}/share-to-family`, {
      visibility: shareVisibility.value,
      force: force || undefined,
    })
    shareConfirmOpen.value = false
    shareForce.open = false
    ElMessage.success(`已发到${productName.value}`)
    await loadPosts()
  } catch (err: any) {
    if (!force && isAlreadySharedError(err)) {
      shareConfirmOpen.value = false
      shareForce.diary = d
      shareForce.open = true
      return
    }
    ElMessage.error(friendlyError(err, '分享失败'))
  } finally {
    shareBusy.value = false
  }
}

onMounted(load)

/** keep-alive 再进入：软刷新列表 */
onActivated(() => {
  void load()
})
</script>

<style scoped>
.page-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
}
.notify-prefs {
  margin-bottom: 12px;
}
.notify-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.lead {
  margin: 4px 0 0;
}
.post-card {
  margin-bottom: 12px;
}
.post-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  margin-bottom: 6px;
}
.post-body {
  white-space: pre-wrap;
  margin: 0 0 8px;
  line-height: 1.5;
}
.post-images {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 0 0 8px;
}
.post-img {
  max-height: 120px;
  max-width: 100%;
  object-fit: cover;
  border-radius: 6px;
}
.img-upload-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.img-thumb-wrap {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
}
.mood-line {
  margin: 0 0 4px;
  font-size: 14px;
}
.post-actions {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
  margin-top: 4px;
  padding-top: 4px;
  border-top: 1px dashed var(--el-border-color-lighter);
}
.thread {
  margin-top: 12px;
  padding-top: 10px;
  border-top: 1px solid var(--el-border-color-lighter);
}
.floor {
  margin: 0 0 10px;
  padding: 8px 0 8px 12px;
  border-left: 3px solid var(--accent-soft, #d8ebe0);
  border-radius: 0 6px 6px 0;
  background: linear-gradient(
    90deg,
    color-mix(in srgb, var(--accent-soft, #d8ebe0) 55%, transparent),
    transparent 72%
  );
}
.floor-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 8px;
}
.floor-no {
  font-size: 12px;
  font-weight: 600;
  color: var(--accent, #2f6f4e);
  font-variant-numeric: tabular-nums;
}
.floor-actions {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 0;
  flex-shrink: 0;
}
.floor-body {
  margin: 4px 0 0;
  white-space: pre-wrap;
  line-height: 1.45;
  font-size: 14px;
}
.floor-reply {
  margin: 8px 0 0 10px;
  padding: 6px 0 6px 10px;
  border-left: 2px dashed color-mix(in srgb, var(--accent, #2f6f4e) 35%, transparent);
}
.thread-more {
  display: block;
  width: 100%;
  margin: 0 0 10px;
  padding: 8px 10px;
  border: none;
  border-radius: 8px;
  background: var(--accent-soft, #d8ebe0);
  color: var(--accent-strong, #1f4d36);
  font-size: 13px;
  cursor: pointer;
  text-align: center;
}
.thread-more:disabled {
  opacity: 0.65;
  cursor: wait;
}
.thread-more:not(:disabled):active {
  filter: brightness(0.97);
}
.thread-empty {
  margin: 0 0 8px;
}
.inline-compose {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 4px;
}
.inline-prompts {
  max-height: 72px;
  overflow: auto;
}
.inline-compose-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
}
.more-wrap {
  display: flex;
  justify-content: center;
  margin: 8px 0 16px;
}
.drawer-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 4px 4px 24px;
}
.mood-row,
.prompt-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.mood-chip,
.prompt-chip {
  border: 1px solid var(--el-border-color);
  background: transparent;
  border-radius: 999px;
  padding: 6px 12px;
  cursor: pointer;
  font-size: 14px;
}
.mood-chip.on {
  border-color: var(--el-color-primary);
  color: var(--el-color-primary);
  background: var(--el-color-primary-light-9);
}
.prompt-chip {
  color: var(--el-text-color-regular);
  background: var(--el-fill-color-light);
}
.prompt-chip:active {
  border-color: var(--el-color-primary);
  color: var(--el-color-primary);
}
.vis-row {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}
.full {
  width: 100%;
}
.comment-row {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px 0;
  border-bottom: 1px solid var(--el-border-color-lighter);
}
.comment-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.comment-actions {
  display: flex;
  align-items: center;
  gap: 0;
  flex-shrink: 0;
}
.comment-reply {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-top: 8px;
  margin-left: 16px;
  padding: 8px 0 0;
  border-top: 1px dashed var(--el-border-color-lighter);
}
.reply-hint {
  display: flex;
  align-items: center;
  gap: 4px;
  margin: 0;
}
.diary-fold {
  margin-top: 16px;
}
.composer-inline {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 12px;
}
.diary-row {
  padding: 10px 0;
  border-top: 1px solid var(--el-border-color-lighter);
}
.close-diary-btn {
  margin-top: 12px;
}
.closed-hint {
  margin: 0 0 8px;
}
.proxy-hint {
  margin-top: 16px;
}
.proxy-hint-strong,
.proxy-compose-banner {
  padding: 10px 12px;
  border-radius: 8px;
  background: var(--surface-soft, #f5f5f5);
  line-height: 1.45;
}
.tiny {
  font-size: 12px;
}
</style>
