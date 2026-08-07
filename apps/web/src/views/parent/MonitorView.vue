<template>
  <div class="page" :class="{ 'tv-mode': isTv }">
    <PageSkeleton v-if="loading" :rows="4" />
    <template v-else>
    <div class="page-head">
      <div>
        <h2 class="page-title" style="margin: 0">{{ isTv ? '今天怎么样' : labels.parentMonitor }}</h2>
        <p v-if="isTv" class="muted tv-monitor-hint">扫一眼今日节奏 · 精细配置请用手机</p>
      </div>
      <div class="page-head-actions">
        <el-button
          v-if="isTv"
          type="primary"
          class="tap-btn"
          @click="$router.push('/ritual')"
        >
          打开客厅仪式屏
        </el-button>
        <el-tag
          v-if="showOfflineRefreshTag"
          type="info"
          effect="plain"
          class="conn-tag"
          title="网络不稳时自动改用定时刷新"
        >
          {{ MONITOR_OFFLINE_REFRESH_LABEL }}
        </el-tag>
      </div>
    </div>

    <EmptyState
      v-if="loadError && !monitor.children.length"
      hero
      title="看板暂时打不开"
      :description="
        knownHasStudents
          ? '学生管理里已有孩子，但今日摘要没加载成功。请再试一次。'
          : '网络或服务暂时不可用，稍后再试。'
      "
      action-label="再试一次"
      secondary-label="去学生管理"
      @action="retryLoad"
      @secondary="$router.push('/parent/students')"
    />

    <div
      v-else-if="loadError && monitor.children.length"
      class="card-panel load-warn"
      role="status"
    >
      <span>摘要刷新没成功，下面仍是刚才的内容。</span>
      <el-button type="primary" text class="tap-btn" @click="retryLoad">再试一次</el-button>
    </div>

    <EmptyState
      v-else-if="!monitor.children.length"
      hero
      title="还没有孩子"
      description="添加孩子并复制登录码后，就能一起开始今天的小事。"
      action-label="去添加孩子"
      @action="$router.push('/parent/students')"
    />

    <template v-if="monitor.children.length">
    <!-- Q1 · 行动区：非 TV 待处理置顶 -->
    <MonitorPendingPanel
      v-if="!isTv"
      variant="phone"
      :confirms="filteredPendingConfirms"
      :proposals="filteredPendingProposals"
      :action-pending-count="actionPendingCount"
      :selected-confirm-ids="selectedConfirmIds"
      :batch-busy="batchBusy"
      :acting-id="actingId"
      :proposal-busy="proposalBusy"
      :child-filter-id="childFilterId"
      :family-confirm-count="monitor.pendingConfirms?.length || 0"
      :family-proposal-count="monitor.pendingProposals?.length || 0"
      @toggle-select="toggleConfirmSelect"
      @batch-approve="batchApproveConfirms"
      @clear-selection="selectedConfirmIds = []"
      @approve="approve"
      @reject="reject"
      @approve-proposal="openApproveProposal"
      @reject-proposal="openRejectProposal"
    />

    <MonitorWeekendBanner v-if="!isTv && showWeekendRitualBanner" />
    <JournalSoftTip
      v-if="!isTv"
      journal-path="/parent/journal"
      age-band="general"
    />

    <div
      class="monitor-body"
      :class="{ 'is-split': useMonitorSplit }"
    >
      <!-- Q1 · 状态区 -->
      <div class="zone-status monitor-main">
        <div class="card-panel headline-card" :class="{ 'tv-headline': isTv }">
          <div class="headline-top">
            <div class="stat-num">{{ `${displayTotalDone}/${displayTotalDue || 0}` }}</div>
            <span v-if="!isTv && headlineScopeLabel" class="headline-scope muted">
              {{ headlineScopeLabel }}
            </span>
          </div>
          <div
            v-if="displayTotalDue > 0"
            class="progress-block headline-progress"
            role="progressbar"
            :aria-valuenow="displayTotalDone"
            :aria-valuemax="displayTotalDue"
          >
            <div class="progress-bar">
              <div class="progress-fill" :style="{ width: `${headlineProgressPct}%` }" />
            </div>
          </div>
          <p class="headline">{{ displayHeadline }}</p>
          <el-button
            v-if="!isTv && monitor.pactAlert?.total"
            text
            type="primary"
            class="tap-btn"
            @click="
              $router.push({
                path: '/parent/pacts',
                query: monitor.pactAlert.parentPending ? { focus: 'parent' } : {},
              })
            "
          >
            查看积分约定
            <template v-if="monitor.pactAlert.parentPending">
              （{{ monitor.pactAlert.parentPending }} 待同意）
            </template>
          </el-button>
        </div>

        <!-- TV：总览后展示待处理 -->
        <MonitorPendingPanel
          v-if="isTv"
          variant="tv"
          :confirms="filteredPendingConfirms"
          :proposals="filteredPendingProposals"
          :action-pending-count="actionPendingCount"
          :acting-id="actingId"
          :proposal-busy="proposalBusy"
          @approve="approve"
          @reject="reject"
          @approve-proposal="openApproveProposal"
          @reject-proposal="openRejectProposal"
        />

        <!-- P2.1：筛选紧挨总览 -->
        <MonitorChildFilter
          v-if="showMultiChildFilter"
          v-model="childFilterId"
          :children="monitor.children"
        />

        <div class="hero-grid">
          <MonitorChildCard
            v-for="c in displayChildren"
            :key="c.studentId"
            :child="c"
            :is-tv="isTv"
            :needs-attention="childNeedsAttention(c)"
            :expanded="isExpanded(c.studentId)"
            :done-expanded="isDoneExpanded(c.studentId)"
            :nudging="nudgingId === c.studentId"
            :nudge-cooldown="nudgeCooldownLabel(c)"
            :can-nudge="canSendNudge(c)"
            :tv-status="tvChildStatus(c)"
            :footnote="timelineFootnote(c)"
            @theme="openThemeDrawer"
            @task-click="onTaskClick"
            @toggle-expand="toggleExpand(c.studentId)"
            @toggle-done-expand="toggleDoneExpand(c.studentId)"
            @nudge="openNudge"
            @go-tasks="goToChildTasks"
            @focus-feed="focusChildFeed"
          />
        </div>
      </div>

      <!-- Q1 · 理解区：右栏动态 + 洞察（非 TV） -->
      <aside v-if="!isTv" class="zone-sense monitor-rail">
        <button
          v-if="isPhone"
          type="button"
          class="zone-sense-toggle"
          @click="senseUserTouched = true; senseOpen = !senseOpen"
        >
          <span>
            <strong>动态与洞察</strong>
            <span
              v-if="!senseOpen && actionPendingCount > 0"
              class="muted tiny sense-pending-hint"
            >
              · 可先处理上方待办
            </span>
          </span>
          <span class="muted">{{ senseOpen ? '收起' : '展开' }}</span>
        </button>
        <div v-show="!isPhone || senseOpen" class="zone-sense-body">
          <!-- P1.3：洞察置顶，避免被长动态挤到侧栏底部 -->
          <MonitorInsightStrip
            v-model:active-id="activeInsightId"
            :items="insightItems"
            :fade-busy="fadeBusy"
            @action="runInsightAction"
            @dismiss="dismissInsight"
          />

          <MonitorFamilyFeed
            v-model:expanded="feedExpanded"
            :events="familyFeedAll"
            :scope-label="feedScopeLabel"
            :show-student-name="!childFilterId"
            :empty-title="childFilterId ? '当前孩子暂无动态' : '还没有动态'"
            :empty-description="
              childFilterId
                ? '切换「全部」可查看其他孩子的动态。'
                : '完成第一件事后，会出现在这里。'
            "
          />
        </div>
      </aside>
    </div>

    </template>
    </template>
    <SoftPrompt
      v-model="prompt.open"
      :title="prompt.title"
      :message="prompt.message"
      :placeholder="prompt.placeholder"
      :confirm-text="prompt.confirmText"
      :templates="prompt.templates"
      :require-note="prompt.requireNote"
      :initial-note="prompt.initialNote"
      :hint="prompt.hint"
      @confirm="onPromptConfirm"
    />
    <SoftPrompt
      v-model="batchApproveOpen"
      title="批量通过"
      :message="batchApproveMessage"
      confirm-text="通过并点赞"
      cancel-text="取消"
      :show-input="false"
      @confirm="onBatchApproveConfirm"
    />
    <SoftStay v-model:message="stayMsg" />
    <ThemeWeekDrawer
      v-model="themeDrawerOpen"
      :student-id="themeEdit.studentId"
      :title="themeEdit.name ? `${themeEdit.name} · 本周主题` : '本周主题'"
      :theme-preset="themeEdit.themePreset"
      :theme-title="themeEdit.themeTitle"
      :text="themeEdit.text"
      @saved="onThemeSaved"
      @suggest="onThemeSuggest"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onActivated, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import http, { getWithMeta } from '../../api/http'
import { useBreakpoint } from '../../composables/useBreakpoint'
import { useSocket } from '../../composables/useSocket'
import { friendlyError } from '../../composables/useOnboarding'
import { labels } from '../../composables/labels'
import { REPAIR_REJECT_TEMPLATES } from '../../composables/eduMood'
import { taskSyncTick, bumpTaskSync } from '../../composables/taskSync'
import {
  createCoalescedAsync,
  createLoadGate,
  tryBegin,
} from '../../composables/asyncGuard'
import { defaultSenseOpen } from '../../composables/monitorSenseOpen'
import {
  buildBatchApprovePromptMessage,
  buildBatchApproveStayMessage,
} from '../../composables/batchApproveCopy'
import {
  mergeTimelines,
  patchCheckinCreated,
  patchCheckinReviewed,
  patchNudgeSent,
  patchProgressChanged,
  patchRedeemRequested,
  type CheckinCreatedPayload,
  type CheckinReviewedPayload,
  type NudgeSentPayload,
  type ProgressChangedPayload,
  type RedeemRequestedPayload,
} from '../../composables/monitorPatch'
import type {
  MonitorChild,
  MonitorEvent,
  MonitorResponse,
  MonitorTodayItem,
} from '../../types/monitor'
import EmptyState from '../../components/EmptyState.vue'
import SoftPrompt from '../../components/SoftPrompt.vue'
import SoftStay from '../../components/SoftStay.vue'
import MonitorPendingPanel from '../../components/MonitorPendingPanel.vue'
import MonitorWeekendBanner from '../../components/MonitorWeekendBanner.vue'
import JournalSoftTip from '../../components/JournalSoftTip.vue'
import { isWeekendRitualDay } from '../../composables/weekendRitualDay'
import {
  MONITOR_OFFLINE_REFRESH_LABEL,
  showMonitorOfflineTag,
} from '../../composables/monitorConnCopy'
import { buildNudgeSuccessToast } from '../../composables/loginNudgeCopy'
import MonitorInsightStrip from '../../components/MonitorInsightStrip.vue'
import MonitorChildCard from '../../components/MonitorChildCard.vue'
import MonitorFamilyFeed from '../../components/MonitorFamilyFeed.vue'
import MonitorChildFilter from '../../components/MonitorChildFilter.vue'
import ThemeWeekDrawer from '../../components/ThemeWeekDrawer.vue'
import PageSkeleton from '../../components/PageSkeleton.vue'

defineOptions({ name: 'ParentMonitorView' })

const router = useRouter()
const { isTv, isPhone, isTablet, isDesktop } = useBreakpoint()
/** 平板/桌面：左孩子卡 · 右动态/洞察 */
const useMonitorSplit = computed(() => !isTv.value && (isTablet.value || isDesktop.value))
const senseOpen = ref(false)
const senseUserTouched = ref(false)
const { connected: wsOk, connect, on } = useSocket()
const showOfflineRefreshTag = computed(() =>
  showMonitorOfflineTag({ isTv: isTv.value, wsConnected: wsOk.value }),
)
const monitor = reactive<MonitorResponse>({
  date: '',
  family: { headline: '', totalDue: 0, totalDone: 0 },
  children: [],
  pendingConfirms: [],
  pendingProposals: [],
  hints: {},
  coachInsights: [],
})
const loading = ref(true)
/** 摘要加载失败（勿与「还没有孩子」混淆） */
const loadError = ref(false)
/** 失败时探测学生管理是否已有娃 */
const knownHasStudents = ref(false)
const actingId = ref(0)
const nudgingId = ref(0)
const batchBusy = ref(false)
const proposalBusy = ref(0)
const fadeBusy = ref(false)
const stayMsg = ref('')
const selectedConfirmIds = ref<number[]>([])
/** P5：会话内已关掉的洞察 id */
const dismissedInsights = ref<Set<string>>(new Set())
const activeInsightId = ref('')
const themeDrawerOpen = ref(false)
const themeEdit = reactive({
  studentId: 0,
  name: '',
  themePreset: '',
  themeTitle: '',
  text: '',
})

function openThemeDrawer(c: MonitorChild) {
  themeEdit.studentId = c.studentId
  themeEdit.name = c.name
  themeEdit.themePreset = c.weekTheme?.themePreset || ''
  themeEdit.themeTitle = c.weekTheme?.themeTitle || ''
  themeEdit.text = c.weekTheme?.text || ''
  themeDrawerOpen.value = true
}

function onThemeSaved(s: {
  themePreset: string
  themeTitle: string
  text: string
}) {
  const c = monitor.children.find((x) => x.studentId === themeEdit.studentId)
  if (!c) return
  c.weekTheme =
    s.themeTitle || s.themePreset || s.text
      ? {
          themeTitle: s.themeTitle,
          themePreset: s.themePreset,
          text: s.text,
          weekKey: c.weekTheme?.weekKey || '',
        }
      : null
}

function onThemeSuggest(title: string) {
  themeDrawerOpen.value = false
  router.push({
    path: '/parent/tasks',
    query: {
      suggestTitle: title,
      suggestMicro: '1',
      studentId: String(themeEdit.studentId || ''),
    },
  })
}

/** 与 nudge.service 默认冷却一致（general） */
const NUDGE_COOLDOWN_MS = 30 * 60 * 1000

const expandedIds = ref<Set<number>>(new Set())
const doneExpandedIds = ref<Set<number>>(new Set())
const childFilterId = ref(0)
const feedExpanded = ref(false)
const monitorLoadGate = createLoadGate()
let nextLite = false
let firstExpandSync = true
/** Visible-tab fallback poll; socket + tick drive most refreshes */
const POLL_MS = 60_000
let timer: number | undefined
let wsEverConnected = false

function afterRealtimePatch(applied: boolean) {
  if (applied) {
    syncExpanded(monitor.children)
    const alive = new Set((monitor.pendingConfirms || []).map((c) => c.id))
    selectedConfirmIds.value = selectedConfirmIds.value.filter((id) => alive.has(id))
  }
  requestLoad(true)
}

const familyHeadline = computed(() => monitor.family?.headline || monitor.headline || '')
const familyTotalDue = computed(() => monitor.family?.totalDue ?? monitor.totalDue ?? 0)
const familyTotalDone = computed(() => monitor.family?.totalDone ?? monitor.totalDone ?? 0)

/** P2.2：总览随孩子筛选联动 */
const filteredChild = computed(() => {
  if (!childFilterId.value) return null
  return monitor.children.find((c) => c.studentId === childFilterId.value) ?? null
})

const displayTotalDone = computed(() => {
  const c = filteredChild.value
  if (c) return c.stats.done
  return familyTotalDone.value
})

const displayTotalDue = computed(() => {
  const c = filteredChild.value
  if (c) return c.stats.due
  return familyTotalDue.value
})

const headlineProgressPct = computed(() => {
  const due = displayTotalDue.value
  if (!due) return 0
  return Math.min(100, Math.round((displayTotalDone.value / due) * 100))
})

const headlineScopeLabel = computed(() => {
  if (childFilterId.value) return filteredChild.value?.name || ''
  if (monitor.children.length >= 2) return '全家'
  return ''
})

const displayHeadline = computed(() => {
  const c = filteredChild.value
  if (c && !isTv.value) {
    const proposalN = (monitor.pendingProposals || []).filter(
      (p) => p.studentId === c.studentId,
    ).length
    const wait = (c.stats.pendingConfirms || 0) + proposalN
    if (wait) return `${wait} 件等你看看`
    if (c.isRestDay) return '休息日 · 学习可以放松'
    if (!c.stats.due) return '今天暂无安排'
    if (c.stats.done >= c.stats.due) return '今天都顾上了，真棒'
    const left = c.stats.due - c.stats.done
    return `还可以一起做 · 还差 ${left} 件`
  }
  if (!isTv.value) return familyHeadline.value || '今天还没有安排'
  const pending =
    (monitor.pendingConfirms?.length || 0) + (monitor.pendingProposals?.length || 0)
  if (pending) return `${pending} 件待处理`
  if (!familyTotalDue.value) return '今天暂无安排'
  if (familyTotalDone.value >= familyTotalDue.value) return '今天都完成啦'
  const left = familyTotalDue.value - familyTotalDone.value
  return `还差 ${left} 件，继续加油`
})

type InsightAction =
  | 'applyFade'
  | 'restDays'
  | 'familyEdu'
  | 'tasks'
  | 'tasksRotate'
  | 'wishes'
  | 'pactsGift'
  | 'growth'
  | 'weekendMeeting'
  | 'students'

type InsightItem = {
  id: string
  chip: string
  title: string
  message: string
  bullets?: string[]
  tone: 'warn' | 'accent' | 'coach' | 'default'
  primary?: { label: string; action: InsightAction; primary?: boolean; loading?: boolean }
  secondary?: { label: string; action: InsightAction }
}

const fadeSuggestLabel = computed(() =>
  monitor.rewardFadeHint?.suggestMode === 'weekly_digest'
    ? '周末一起结算'
    : '有时加分',
)

const fairnessActionMessage = computed(() => {
  const h = monitor.fairnessHint
  if (!h?.message) return ''
  if (h.kind === 'elder_heavy') {
    return `最近共享家务多由「${h.dominantName || '大孩'}」在做。建议：给家务任务打开「按天轮值」，让弟弟妹妹也有主责机会。`
  }
  if (h.dominantName) {
    return `最近共享家务多由「${h.dominantName}」完成。建议打开「按天轮值」，让分工更均匀。`
  }
  return h.message
})

/** P5.1 / P5.3：归一化 + 优先级（兑现 > 淡出 > 过载 > 公平 > 赠予 > 教练） */
const insightItems = computed((): InsightItem[] => {
  const dismissed = dismissedInsights.value
  const items: InsightItem[] = []

  if (monitor.overdueRedeemHint?.count && !dismissed.has('overdue')) {
    items.push({
      id: 'overdue',
      chip: '兑现',
      title: '兑现提醒',
      message: monitor.overdueRedeemHint.message || '有愿望还等着兑现',
      tone: 'warn',
      primary: { label: '去愿望兑现', action: 'wishes', primary: true },
    })
  }
  if (monitor.nearWishHint?.message && !dismissed.has('nearWish')) {
    items.push({
      id: 'nearWish',
      chip: '近端',
      title: monitor.nearWishHint.ready ? '近端愿望可兑' : '近端愿望快到手',
      message: monitor.nearWishHint.message,
      tone: 'accent',
      primary: { label: '去愿望', action: 'wishes', primary: true },
    })
  }
  if (monitor.rewardFadeHint?.show && !dismissed.has('fade')) {
    items.push({
      id: 'fade',
      chip: '节奏',
      title: '加分节奏建议',
      message: monitor.rewardFadeHint.message || '',
      tone: 'default',
      primary: {
        label: `一键试试「${fadeSuggestLabel.value}」`,
        action: 'applyFade',
        primary: true,
        loading: true,
      },
      secondary: { label: '去教育设置', action: 'familyEdu' },
    })
  }
  if (monitor.parentOverloadHint?.show && !dismissed.has('overload')) {
    items.push({
      id: 'overload',
      chip: '节奏',
      title: '节奏小提示',
      message: monitor.parentOverloadHint.message || '',
      bullets: monitor.parentOverloadHint.suggestions || [],
      tone: 'warn',
      primary: { label: '去任务清单', action: 'tasks' },
    })
  }
  if (monitor.fairnessHint?.message && !dismissed.has('fairness')) {
    items.push({
      id: 'fairness',
      chip: '分担',
      title: '多孩分担小提示',
      message: fairnessActionMessage.value,
      tone: 'accent',
      primary: { label: '去任务开轮值', action: 'tasksRotate' },
      secondary: monitor.birthOrderHint?.show
        ? { label: '去设排行', action: 'students' }
        : undefined,
    })
  }
  if (
    monitor.birthOrderHint?.show &&
    monitor.birthOrderHint.message &&
    !dismissed.has('birthOrder') &&
    !monitor.fairnessHint?.message
  ) {
    items.push({
      id: 'birthOrder',
      chip: '排行',
      title: '家里排行还没标全',
      message: monitor.birthOrderHint.message,
      tone: 'default',
      primary: { label: '去学生管理设置', action: 'students', primary: true },
    })
  }
  if (monitor.giftFairnessHint?.message && !dismissed.has('gift')) {
    items.push({
      id: 'gift',
      chip: '心意',
      title: '积分心意小提示',
      message: monitor.giftFairnessHint.message,
      tone: 'accent',
      primary: { label: '查看赠予', action: 'pactsGift' },
      secondary: { label: '去任务开轮值', action: 'tasks' },
    })
  }

  // P3.3：周五–日 + 有主题孩子 → 作品集收尾软提示
  if (isWeekendRitualDay() && !dismissed.has('portfolioWeekend')) {
    const themed = (monitor.children || []).filter((c) => c.weekTheme?.themeTitle)
    if (themed.length) {
      const names = themed
        .slice(0, 2)
        .map((c) => c.name || '孩子')
        .join('、')
      const more = themed.length > 2 ? `等 ${themed.length} 人` : ''
      items.push({
        id: 'portfolioWeekend',
        chip: '收尾',
        title: '本周主题可以收个尾',
        message: `${names}${more}这周有主题，周末一起翻翻成长作品集，或开个周末小会。`,
        tone: 'accent',
        primary: { label: '去作品集', action: 'growth', primary: true },
        secondary: { label: '周末小会', action: 'weekendMeeting' },
      })
    }
  }

  if ((monitor.coachInsights || []).length && !dismissed.has('coach')) {
    const coaches = monitor.coachInsights || []
    const first = coaches[0]
    const extra = coaches
      .slice(1)
      .map((c) => c.message)
      .filter(Boolean)
    const coachCta = coachActionForKind(first?.kind)
    items.push({
      id: 'coach',
      chip: '教练',
      title: '教练视角',
      message: first?.message || '',
      bullets: [
        ...(first?.suggestion ? [first.suggestion] : []),
        ...extra,
      ],
      tone: 'coach',
      primary: coachCta,
    })
  }
  return items
})

function coachActionForKind(
  kind?: string,
): { label: string; action: InsightAction; primary?: boolean } | undefined {
  switch (kind) {
    case 'mood':
    case 'defer':
      return { label: '去任务清单调整', action: 'tasks' }
    case 'slot':
      return { label: '去任务改时段', action: 'tasks' }
    case 'confirm':
      return { label: '去教育设置', action: 'familyEdu' }
    case 'focus':
      return { label: '去周末小会聊聊', action: 'weekendMeeting' }
    default:
      return { label: '去任务清单', action: 'tasks' }
  }
}

watch(
  insightItems,
  (list) => {
    if (!list.length) {
      activeInsightId.value = ''
      return
    }
    if (!list.some((i) => i.id === activeInsightId.value)) {
      activeInsightId.value = list[0].id
    }
  },
  { immediate: true },
)

watch(
  () =>
    [
      insightItems.value.length,
      (monitor.pendingConfirms?.length || 0) + (monitor.pendingProposals?.length || 0),
    ] as const,
  ([insightCount, pendingCount]) => {
    const next = defaultSenseOpen({
      isPhone: isPhone.value,
      userTouched: senseUserTouched.value,
      insightCount,
      pendingCount,
    })
    if (next === null) return
    senseOpen.value = next
  },
  { immediate: true },
)

function dismissInsight(id: string) {
  const next = new Set(dismissedInsights.value)
  next.add(id)
  dismissedInsights.value = next
}

function runInsightAction(action: InsightAction) {
  if (action === 'applyFade') {
    void applyFadeSuggest()
    return
  }
  if (action === 'restDays') {
    router.push('/parent/rest-days')
    return
  }
  if (action === 'familyEdu') {
    router.push('/parent/family-edu')
    return
  }
  if (action === 'tasks') {
    router.push('/parent/tasks')
    return
  }
  if (action === 'tasksRotate') {
    router.push({ path: '/parent/tasks', query: { focus: 'rotate' } })
    return
  }
  if (action === 'wishes') {
    router.push('/parent/wishes')
    return
  }
  if (action === 'growth') {
    router.push({ path: '/parent/growth', query: { tab: 'portfolio' } })
    return
  }
  if (action === 'weekendMeeting') {
    router.push('/parent/weekend-meeting')
    return
  }
  if (action === 'students') {
    router.push({ path: '/parent/students', query: { focus: 'birth' } })
    return
  }
  if (action === 'pactsGift') {
    router.push({ path: '/parent/pacts', query: { tab: 'gift' } })
  }
}

/** P1.1：2 孩起显示筛选 */
const showMultiChildFilter = computed(
  () => !isTv.value && monitor.children.length >= 2,
)

const displayChildren = computed(() => {
  if (!childFilterId.value) return monitor.children
  return monitor.children.filter((c) => c.studentId === childFilterId.value)
})

/** P0.4：待确认 / 提议随孩子筛选联动 */
const filteredPendingConfirms = computed(() => {
  const list = monitor.pendingConfirms || []
  if (!childFilterId.value) return list
  return list.filter((p) => p.studentId === childFilterId.value)
})

const filteredPendingProposals = computed(() => {
  const list = monitor.pendingProposals || []
  if (!childFilterId.value) return list
  return list.filter((p) => p.studentId === childFilterId.value)
})

const actionPendingCount = computed(
  () => filteredPendingConfirms.value.length + filteredPendingProposals.value.length,
)

/** 周五–日：看板轻触达周末小会（不依赖洞察是否展开） */
const showWeekendRitualBanner = computed(() => isWeekendRitualDay())

const PROPOSAL_POINT_TEMPLATES = ['5 分（推荐）', '10 分', '先不计分']
const PROPOSAL_REJECT_TEMPLATES = [
  '这周任务已经够多了，下周再试',
  '先把正在练的小事稳住，再加新的',
  '这个想法很好，我们改成更小的一步再试',
]

function parseProposalPoints(note: string) {
  const n = note.trim()
  if (!n) return 5
  if (/不计分|^0\b/.test(n)) return 0
  const m = n.match(/(\d+)\s*分/)
  if (m) return Math.min(50, Math.max(0, Number(m[1])))
  if (/^\d+$/.test(n)) return Math.min(50, Math.max(0, Number(n)))
  return 5
}

watch(childFilterId, () => {
  const visible = new Set(filteredPendingConfirms.value.map((p) => p.id))
  selectedConfirmIds.value = selectedConfirmIds.value.filter((id) => visible.has(id))
  feedExpanded.value = false
})

function childNeedsAttention(c: MonitorChild) {
  const hasProposal = (monitor.pendingProposals || []).some(
    (p) => p.studentId === c.studentId,
  )
  return (
    c.stats.pendingConfirms > 0 ||
    hasProposal ||
    (c.stats.due > 0 && c.stats.done < c.stats.due)
  )
}

function tvChildStatus(c: MonitorChild) {
  const proposalN = (monitor.pendingProposals || []).filter(
    (p) => p.studentId === c.studentId,
  ).length
  const wait = (c.stats.pendingConfirms || 0) + proposalN
  if (wait) return `${wait} 待处理`
  if (c.isRestDay) return '休息日'
  if (!c.stats.due) return '暂无安排'
  if (c.stats.done >= c.stats.due) return '全部完成'
  return `还差 ${c.stats.due - c.stats.done} 件`
}

function onTaskClick(c: MonitorChild, t: MonitorTodayItem) {
  if (isTv.value) return
  goTask(c, t)
}

function isExpanded(studentId: number) {
  return expandedIds.value.has(studentId)
}

function toggleExpand(studentId: number) {
  const next = new Set(expandedIds.value)
  if (next.has(studentId)) next.delete(studentId)
  else next.add(studentId)
  expandedIds.value = next
}

function isDoneExpanded(studentId: number) {
  return doneExpandedIds.value.has(studentId)
}

function toggleDoneExpand(studentId: number) {
  const next = new Set(doneExpandedIds.value)
  if (next.has(studentId)) next.delete(studentId)
  else next.add(studentId)
  doneExpandedIds.value = next
}

function incompleteTasks(c: MonitorChild) {
  return (c.todayTasks || []).filter((t) => t.status !== 'done')
}

function lastNudgeAt(c: MonitorChild) {
  const events = (c.timeline || []).filter((ev) => ev.kind === 'nudge_sent')
  if (!events.length) return null
  const ts = Math.max(...events.map((ev) => new Date(ev.at).getTime()))
  return Number.isFinite(ts) ? ts : null
}

function nudgeCooldownRemainMs(c: MonitorChild) {
  const last = lastNudgeAt(c)
  if (!last) return 0
  return Math.max(0, NUDGE_COOLDOWN_MS - (Date.now() - last))
}

function nudgeCooldownLabel(c: MonitorChild) {
  const remain = nudgeCooldownRemainMs(c)
  if (remain <= 0 || !incompleteTasks(c).length) return ''
  const min = Math.ceil(remain / 60000)
  return `约 ${min} 分钟后可再轻轻提醒`
}

function canSendNudge(c: MonitorChild) {
  return incompleteTasks(c).length > 0 && nudgeCooldownRemainMs(c) === 0
}

function goToChildTasks(c: MonitorChild) {
  router.push({
    path: '/parent/tasks',
    query: { studentId: String(c.studentId) },
  })
}

function syncExpanded(children: MonitorChild[]) {
  if (firstExpandSync) {
    firstExpandSync = false
    expandedIds.value = new Set(
      children.filter(childNeedsAttention).map((c) => c.studentId),
    )
    return
  }
  const next = new Set(expandedIds.value)
  for (const c of children) {
    if (c.stats.pendingConfirms > 0) next.add(c.studentId)
  }
  expandedIds.value = next
}

function goTask(c: MonitorChild, t: MonitorTodayItem) {
  if (t.kind === 'task') {
    router.push({
      path: '/parent/tasks',
      query: { studentId: String(c.studentId), assignId: String(t.id) },
    })
    return
  }
  goToChildTasks(c)
}

async function applyFadeSuggest() {
  const mode = monitor.rewardFadeHint?.suggestMode
  if (!mode) return
  if (!tryBegin(fadeBusy)) return
  try {
    await http.put('/family/settings', { rewardMode: mode })
    monitor.rewardMode = mode
    monitor.rewardFadeHint = null
    if (monitor.hints) monitor.hints.rewardFadeHint = null
    ElMessage.success(
      mode === 'weekly_digest'
        ? '已改为周末一起结算：日常先庆祝，周末一起看'
        : '已改为有时加分：完成仍庆祝，积分偶尔惊喜',
    )
  } catch (e: any) {
    ElMessage.error(friendlyError(e, '没改成功'))
  } finally {
    fadeBusy.value = false
  }
}
const prompt = reactive({
  open: false,
  mode: 'approve' as
    | 'approve'
    | 'reject'
    | 'nudge'
    | 'proposalApprove'
    | 'proposalReject',
  target: null as any,
  title: '',
  message: '',
  placeholder: '',
  confirmText: '确定',
  templates: [] as string[],
  requireNote: false,
  initialNote: '',
  hint: '',
})

/** P4：页级统一家庭动态（随筛选联动） */
const familyFeedAll = computed(() => {
  const children = childFilterId.value
    ? monitor.children.filter((c) => c.studentId === childFilterId.value)
    : monitor.children
  return children
    .flatMap((c) => c.timeline || [])
    .filter((ev) => ev.confirmStatus !== 'pending')
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
})

const feedScopeLabel = computed(() => {
  if (!childFilterId.value) return ''
  return filteredChild.value?.name || ''
})

function timelineFootnote(c: MonitorChild): MonitorEvent | null {
  if (childFilterId.value) return null
  const events = (c.timeline || []).filter((ev) => ev.confirmStatus !== 'pending')
  if (!events.length) return null
  return events.reduce((latest, ev) =>
    new Date(ev.at).getTime() > new Date(latest.at).getTime() ? ev : latest,
  )
}

/** P2.1：脚注 → 筛选该孩 + 展开动态栏，进入统一流 */
function focusChildFeed(c: MonitorChild) {
  childFilterId.value = c.studentId
  senseUserTouched.value = true
  senseOpen.value = true
  feedExpanded.value = false
}

const APPROVE_TEMPLATES = [
  '这一步方法用得不错，继续',
  '看到你自己检查了一遍，真好',
  '难的地方你坚持住了，很棒',
  '今天节奏稳，比催促更重要',
  '认真完成的样子，我看见了',
]
const REJECT_TEMPLATES = [
  ...REPAIR_REJECT_TEMPLATES,
  '再仔细一点也没关系，我们一起改',
  '下次可以先检查一遍再提交',
]
const NUDGE_TEMPLATES = [
  '加油，下一件很快就好',
  '先做最上面那一件就行',
  '做完告诉我一声，我给你点赞',
]

const monitorEtags = { full: '', lite: '' }

async function loadOnce() {
  const ticket = monitorLoadGate.next()
  const lite = nextLite
  nextLite = false
  try {
    const etagKey = lite ? 'lite' : 'full'
    const prevEtag = monitorEtags[etagKey]
    const meta = await getWithMeta<MonitorResponse>(
      lite ? '/dashboard/monitor?lite=1' : '/dashboard/monitor',
      {
        headers: prevEtag ? { 'If-None-Match': prevEtag } : undefined,
        validateStatus: (s) => (s >= 200 && s < 300) || s === 304,
      },
    )
    if (!ticket.isCurrent()) return
    if (meta.etag) monitorEtags[etagKey] = meta.etag
    if (meta.notModified) {
      loadError.value = false
      return
    }
    const data = meta.data
    loadError.value = false
    knownHasStudents.value = false
    const prevByStudent = new Map(
      monitor.children.map((c) => [
        c.studentId,
        {
          timeline: c.timeline,
          deferredToday: c.deferredToday,
          streak: c.stats?.streak ?? (c as any).streak,
          nextWish: c.nextWish,
        },
      ]),
    )
    const prevHints = {
      fairnessHint: monitor.fairnessHint,
      giftFairnessHint: monitor.giftFairnessHint,
      overdueRedeemHint: monitor.overdueRedeemHint,
      parentOverloadHint: monitor.parentOverloadHint,
      nearWishHint: monitor.nearWishHint,
      birthOrderHint: monitor.birthOrderHint,
      rewardFadeHint: monitor.rewardFadeHint,
      pactAlert: monitor.pactAlert,
      coachInsights: monitor.coachInsights,
    }
    const prevRewardMode = monitor.rewardMode
    monitor.date = data.date
    monitor.family = data.family
    monitor.children = (data.children || []).map((c) => {
      const prev = prevByStudent.get(c.studentId)
      if (!lite) return c
      const streak =
        c.stats?.streak && c.stats.streak > 0
          ? c.stats.streak
          : prev?.streak || c.stats?.streak || 0
      return {
        ...c,
        timeline: mergeTimelines(prev?.timeline, c.timeline),
        deferredToday: c.deferredToday ?? prev?.deferredToday,
        stats: c.stats ? { ...c.stats, streak } : c.stats,
        nextWish: c.nextWish ?? (prev as any)?.nextWish,
      }
    })
    monitor.pendingConfirms = data.pendingConfirms || []
    monitor.pendingProposals = data.pendingProposals || []
    monitor.hints = data.hints || {}
    monitor.lite = data.lite
    if (data.rewardMode != null) monitor.rewardMode = data.rewardMode
    else if (lite && prevRewardMode) monitor.rewardMode = prevRewardMode
    monitor.headline = data.headline ?? data.family?.headline
    monitor.totalDue = data.totalDue ?? data.family?.totalDue
    monitor.totalDone = data.totalDone ?? data.family?.totalDone

    // P0.2：lite 勿用空哨兵覆盖洞察；full 才完整替换
    if (!lite) {
      monitor.pactAlert = data.pactAlert ?? data.hints?.pactAlert
      monitor.rewardFadeHint = data.rewardFadeHint ?? data.hints?.rewardFadeHint
      monitor.fairnessHint = data.fairnessHint ?? data.hints?.fairnessHint
      monitor.giftFairnessHint = data.giftFairnessHint ?? data.hints?.giftFairnessHint
      monitor.overdueRedeemHint = data.overdueRedeemHint ?? data.hints?.overdueRedeemHint
      monitor.parentOverloadHint =
        data.parentOverloadHint ?? data.hints?.parentOverloadHint
      monitor.nearWishHint = data.nearWishHint ?? data.hints?.nearWishHint
      monitor.birthOrderHint = data.birthOrderHint ?? data.hints?.birthOrderHint
      monitor.coachInsights = data.coachInsights ?? data.hints?.coachInsights ?? []
    } else {
      monitor.pactAlert =
        data.pactAlert ?? data.hints?.pactAlert ?? prevHints.pactAlert
      const fade = data.rewardFadeHint ?? data.hints?.rewardFadeHint
      if (fade != null) monitor.rewardFadeHint = fade
      else if (prevHints.rewardFadeHint) monitor.rewardFadeHint = prevHints.rewardFadeHint
      const fair = data.fairnessHint ?? data.hints?.fairnessHint
      if (fair != null) monitor.fairnessHint = fair
      else monitor.fairnessHint = prevHints.fairnessHint
      const gift = data.giftFairnessHint ?? data.hints?.giftFairnessHint
      if (gift != null) monitor.giftFairnessHint = gift
      else monitor.giftFairnessHint = prevHints.giftFairnessHint
      const overdue = data.overdueRedeemHint ?? data.hints?.overdueRedeemHint
      if (overdue != null) monitor.overdueRedeemHint = overdue
      else monitor.overdueRedeemHint = prevHints.overdueRedeemHint
      const overload = data.parentOverloadHint ?? data.hints?.parentOverloadHint
      if (overload != null) monitor.parentOverloadHint = overload
      else monitor.parentOverloadHint = prevHints.parentOverloadHint
      const near = data.nearWishHint ?? data.hints?.nearWishHint
      if (near != null) monitor.nearWishHint = near
      else monitor.nearWishHint = prevHints.nearWishHint
      const birth = data.birthOrderHint ?? data.hints?.birthOrderHint
      if (birth != null) monitor.birthOrderHint = birth
      else monitor.birthOrderHint = prevHints.birthOrderHint
      const coaches = data.coachInsights ?? data.hints?.coachInsights
      if (Array.isArray(coaches) && coaches.length) {
        monitor.coachInsights = coaches
      } else {
        monitor.coachInsights = prevHints.coachInsights || []
      }
    }
    syncExpanded(monitor.children)
    const alive = new Set((monitor.pendingConfirms || []).map((c) => c.id))
    selectedConfirmIds.value = selectedConfirmIds.value.filter((id) => alive.has(id))
  } catch (e: any) {
    if (!ticket.isCurrent()) return
    loadError.value = true
    ElMessage.error(friendlyError(e, '摘要暂时打不开，稍后再试'))
    if (!monitor.children.length) {
      try {
        const list = (await http.get('/students')) as any[]
        if (!ticket.isCurrent()) return
        knownHasStudents.value = Array.isArray(list) && list.length > 0
      } catch {
        /* ignore probe */
      }
    }
  } finally {
    if (ticket.isCurrent()) loading.value = false
  }
}

function retryLoad() {
  loadError.value = false
  loading.value = true
  nextLite = false
  void coalescedLoad.runNow()
}

const coalescedLoad = createCoalescedAsync(loadOnce, { waitMs: 400 })

function requestLoad(soft = true) {
  if (soft) nextLite = true
  coalescedLoad.schedule()
}

function toggleConfirmSelect(id: number, checked: boolean) {
  if (checked) {
    if (!selectedConfirmIds.value.includes(id)) {
      selectedConfirmIds.value = [...selectedConfirmIds.value, id]
    }
  } else {
    selectedConfirmIds.value = selectedConfirmIds.value.filter((x) => x !== id)
  }
}

const batchApproveOpen = ref(false)
const batchApproveMessage = ref('')
const batchApproveNormals = ref<any[]>([])

function batchApproveConfirms() {
  const ids = [...selectedConfirmIds.value]
  if (!ids.length) return
  if (batchBusy.value) return
  const rows = (monitor.pendingConfirms || []).filter((c: any) => ids.includes(c.id))
  const normals = rows.filter((c: any) => !c.isMakeup)
  const makeups = rows.length - normals.length
  if (!normals.length) {
    ElMessage.warning('补上进度请单条确认')
    return
  }
  batchApproveNormals.value = normals
  batchApproveMessage.value = buildBatchApprovePromptMessage(
    normals.length,
    makeups,
  )
  batchApproveOpen.value = true
}

async function onBatchApproveConfirm() {
  const normals = batchApproveNormals.value
  batchApproveOpen.value = false
  batchApproveNormals.value = []
  if (!normals.length) return
  if (!tryBegin(batchBusy)) return
  try {
    const res: any = await http.post('/checkins/confirm-batch', {
      ids: normals.map((c: any) => c.id),
      action: 'approve',
      liked: true,
      note: APPROVE_TEMPLATES[0],
      skipMakeup: true,
    })
    const ok = res?.okCount ?? res?.ok?.length ?? 0
    const fail = res?.failCount ?? res?.failed?.length ?? 0
    if (ok) stayMsg.value = buildBatchApproveStayMessage(ok)
    if (fail) ElMessage.warning(`${fail} 条失败`)
    selectedConfirmIds.value = []
    nextLite = false
    await coalescedLoad.runNow()
  } catch (e: any) {
    ElMessage.error(friendlyError(e, '批量通过没成功'))
  } finally {
    batchBusy.value = false
  }
}

async function confirm(
  c: any,
  action: 'approve' | 'reject',
  note?: string,
  liked?: boolean,
) {
  if (actingId.value) return
  actingId.value = c.id
  try {
    await http.post(`/checkins/${c.id}/confirm`, {
      action,
      note,
      liked: action === 'approve' ? liked !== false : false,
    })
    stayMsg.value =
      action === 'approve'
        ? liked === false
          ? '已通过，积分已到账'
          : '已通过并点赞，孩子会收到鼓励'
        : '已请孩子再改改'
    nextLite = false
    await coalescedLoad.runNow()
  } catch (e: any) {
    ElMessage.error(friendlyError(e, '操作没成功，稍后再试'))
  } finally {
    actingId.value = 0
  }
}

function approve(c: any) {
  prompt.mode = 'approve'
  prompt.target = c
  prompt.title = c.isMakeup ? '通过补上进度并点赞' : '通过并点赞'
  prompt.message = c.isMakeup
    ? '补上进度通过后发放部分积分。写一句过程赞，孩子会更有动力。'
    : '写一句过程赞（努力、方法、节奏），比笼统「真棒」更能养胜任感。'
  prompt.placeholder = '例如：这一步方法用得不错'
  prompt.confirmText = c.isMakeup ? '通过补上进度' : '通过并点赞'
  prompt.templates = APPROVE_TEMPLATES
  prompt.requireNote = true
  prompt.initialNote = APPROVE_TEMPLATES[0]
  prompt.hint = '点模板可快速填入，也可自己改'
  prompt.open = true
}

function reject(c: any) {
  prompt.mode = 'reject'
  prompt.target = c
  prompt.title = '再改改'
  prompt.message = '跟孩子说一句，比单纯退回更有温度。'
  prompt.placeholder = '例如：再仔细一点也没关系'
  prompt.confirmText = '发给孩子'
  prompt.templates = REJECT_TEMPLATES
  prompt.requireNote = true
  prompt.initialNote = ''
  prompt.hint = ''
  prompt.open = true
}

async function onPromptConfirm(note: string) {
  const c = prompt.target
  if (!c) return
  if (prompt.mode === 'nudge') {
    await sendNudge(c, note)
    return
  }
  if (prompt.mode === 'proposalApprove') {
    await submitApproveProposal(c, parseProposalPoints(note))
    return
  }
  if (prompt.mode === 'proposalReject') {
    await submitRejectProposal(c, note)
    return
  }
  if (prompt.mode === 'approve') await confirm(c, 'approve', note, true)
  else await confirm(c, 'reject', note)
}

function openApproveProposal(p: any) {
  prompt.mode = 'proposalApprove'
  prompt.target = p
  prompt.title = '同意加入清单'
  prompt.message = `${p.studentName || '孩子'}想加「${p.title}」。选一个建议分值，商量着来。`
  prompt.placeholder = '或写分值，例如 5'
  prompt.confirmText = '加入清单'
  prompt.templates = PROPOSAL_POINT_TEMPLATES
  prompt.requireNote = false
  prompt.initialNote = '5 分（推荐）'
  prompt.hint = '不选也默认 5 分'
  prompt.open = true
}

function openRejectProposal(p: any) {
  prompt.mode = 'proposalReject'
  prompt.target = p
  prompt.title = '再商量'
  prompt.message = `写一句说明，帮孩子理解为什么「${p.title}」暂时不合适`
  prompt.placeholder = '例如：这周先稳住正在练的'
  prompt.confirmText = '发给孩子'
  prompt.templates = PROPOSAL_REJECT_TEMPLATES
  prompt.requireNote = true
  prompt.initialNote = ''
  prompt.hint = '写一句给对方，沟通更顺畅'
  prompt.open = true
}

async function submitApproveProposal(p: any, pointsReward: number) {
  if (proposalBusy.value) return
  proposalBusy.value = p.id
  try {
    await http.post(`/task-proposals/${p.id}/approve`, { pointsReward })
    ElMessage.success(`已加入「${p.title}」`)
    stayMsg.value = `「${p.title}」已加入清单`
    monitor.pendingProposals = (monitor.pendingProposals || []).filter(
      (x) => x.id !== p.id,
    )
    bumpTaskSync()
    requestLoad(true)
  } catch (e: any) {
    ElMessage.error(friendlyError(e, '没能加入'))
  } finally {
    proposalBusy.value = 0
  }
}

async function submitRejectProposal(p: any, note: string) {
  if (!note.trim()) return
  if (proposalBusy.value) return
  proposalBusy.value = p.id
  try {
    await http.post(`/task-proposals/${p.id}/reject`, { note: note.trim() })
    ElMessage.success('已回复孩子')
    monitor.pendingProposals = (monitor.pendingProposals || []).filter(
      (x) => x.id !== p.id,
    )
  } catch (e: any) {
    ElMessage.error(friendlyError(e, '没能回复'))
  } finally {
    proposalBusy.value = 0
  }
}

function openNudge(c: MonitorChild) {
  if (!canSendNudge(c)) return
  const first = incompleteTasks(c)[0]
  prompt.mode = 'nudge'
  prompt.target = c
  prompt.title = `轻轻提醒 ${c.name}`
  prompt.message = '选一句鼓励，或改成你的话。提醒有冷却，不会太频繁。'
  prompt.placeholder = '加油，下一件很快就好'
  prompt.confirmText = '发送提醒'
  prompt.templates = NUDGE_TEMPLATES
  prompt.requireNote = true
  prompt.initialNote = NUDGE_TEMPLATES[0]
  prompt.hint = first
    ? `「${first.title}」还没收尾，写一句鼓励就好`
    : '写一句鼓励就好'
  prompt.open = true
}

async function sendNudge(c: any, message: string) {
  if (nudgingId.value) return
  nudgingId.value = c.studentId
  try {
    const res: any = await http.post(`/students/${c.studentId}/nudge`, {
      message: message.trim() || undefined,
    })
    if (res?.ok === false) {
      ElMessage.warning(res.message || '稍后再提醒吧')
      return
    }
    ElMessage.success(buildNudgeSuccessToast(c.name, res?.parentHint))
    patchNudgeSent(monitor, {
      studentId: c.studentId,
      message: message.trim() || NUDGE_TEMPLATES[0],
      fromName: '你',
      at: new Date().toISOString(),
    })
  } catch (e: any) {
    ElMessage.warning(friendlyError(e, '稍后再提醒吧'))
  } finally {
    nudgingId.value = 0
  }
}

function connectWs() {
  connect()
  on('checkin:created', (payload: CheckinCreatedPayload) => {
    afterRealtimePatch(patchCheckinCreated(monitor, payload))
  })
  on('progress:changed', (payload: ProgressChangedPayload) => {
    afterRealtimePatch(patchProgressChanged(monitor, payload))
  })
  on('checkin:reviewed', (payload: CheckinReviewedPayload) => {
    afterRealtimePatch(patchCheckinReviewed(monitor, payload))
  })
  on('nudge:sent', (payload: NudgeSentPayload) => {
    afterRealtimePatch(patchNudgeSent(monitor, payload))
  })
  on('redeem:requested', (payload: RedeemRequestedPayload) => {
    ElMessage.info(`${payload.studentName || '孩子'}申请兑换愿望啦`)
    afterRealtimePatch(patchRedeemRequested(monitor, payload))
  })
}

function clearPoll() {
  if (timer) {
    clearInterval(timer)
    timer = undefined
  }
}

function startPoll() {
  clearPoll()
  timer = window.setInterval(() => {
    if (document.visibilityState !== 'visible') return
    // 后台轮询只用 lite，减轻服务端；可见性恢复 / 关键操作仍走全量
    requestLoad(true)
  }, POLL_MS)
}

function onVisibilityChange() {
  if (document.visibilityState === 'visible') {
    requestLoad(false)
    startPoll()
  } else {
    clearPoll()
  }
}

onMounted(async () => {
  nextLite = false
  await coalescedLoad.runNow()
  connectWs()
  startPoll()
  document.addEventListener('visibilitychange', onVisibilityChange)
})

let skipActivatedLoad = true
onActivated(() => {
  if (skipActivatedLoad) {
    skipActivatedLoad = false
    return
  }
  requestLoad(false)
})

watch(taskSyncTick, () => {
  requestLoad(false)
})

watch(wsOk, (ok) => {
  if (ok) {
    if (wsEverConnected) {
      nextLite = false
      void coalescedLoad.runNow()
    }
    wsEverConnected = true
  }
})

onUnmounted(() => {
  clearPoll()
  coalescedLoad.cancel()
  document.removeEventListener('visibilitychange', onVisibilityChange)
})
</script>

<style scoped>
.headline-card {
  text-align: center;
  margin-bottom: 14px;
}
.headline-top {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 10px;
  flex-wrap: wrap;
}
.headline-scope {
  font-size: 0.9rem;
}
.headline-progress {
  margin: 10px auto 4px;
  max-width: 280px;
}
.rhythm-line {
  margin: 0 0 8px;
  font-size: 0.95rem;
}
.headline {
  margin: 8px 0 0;
  font-size: 1.1rem;
  font-weight: 600;
  font-family: var(--font-display);
}
.monitor-body {
  display: flex;
  flex-direction: column;
  gap: 14px;
  margin-bottom: 14px;
}
.monitor-body.is-split {
  display: grid;
  grid-template-columns: minmax(0, 3fr) minmax(280px, 2fr);
  gap: 16px;
  align-items: start;
}
.monitor-main {
  min-width: 0;
}
.monitor-rail {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.zone-sense-toggle {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 12px 14px;
  border: 1px dashed var(--line);
  background: transparent;
  border-radius: var(--radius, 12px);
  cursor: pointer;
  text-align: left;
  font: inherit;
  color: inherit;
}
.zone-sense-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.monitor-body.is-split .monitor-rail {
  position: sticky;
  top: 16px;
  max-height: calc(100vh - 32px);
  overflow-y: auto;
}
.monitor-body.is-split :deep(.family-feed),
.monitor-body.is-split :deep(.insight-strip) {
  margin-bottom: 0;
}
.hero-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
  margin-bottom: 0;
}
.progress-block {
  margin: 8px 0 10px;
}
.progress-bar {
  height: 8px;
  border-radius: 999px;
  background: var(--line);
  overflow: hidden;
}
.progress-fill {
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, var(--accent, #3d8b6e), var(--accent-strong, #2f6f56));
  transition: width 0.35s ease;
}
@media (min-width: 768px) {
  .monitor-body:not(.is-split) .hero-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .monitor-body.is-split .hero-grid {
    grid-template-columns: 1fr;
  }
}
@media (min-width: 1200px) {
  .monitor-body.is-split .hero-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (min-width: 1600px) {
  .headline {
    font-size: 1.4rem;
  }
  .pending-actions .tap-btn {
    min-width: 140px;
  }
}
.page.tv-mode .stat-num {
  font-size: 3.2rem;
  line-height: 1.1;
}
.tv-monitor-hint {
  margin: 6px 0 0;
  font-size: 1.05rem;
}
.page-head-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.load-warn {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}
.page.tv-mode .headline-card.tv-headline {
  padding: 20px 16px;
}
.page.tv-mode .headline {
  font-size: 1.55rem;
  margin-top: 10px;
}
.page.tv-mode .hero-grid {
  grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
  gap: 16px;
}
.page.tv-mode :deep(.hero-top h3) {
  font-size: 1.55rem;
}
.page.tv-mode :deep(.tv-status) {
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--accent-strong, #2f6f56);
}
.page.tv-mode :deep(.progress-bar),
.page.tv-mode .progress-bar {
  height: 12px;
}
.page.tv-mode :deep(.rhythm-line),
.page.tv-mode .rhythm-line {
  font-size: 1.05rem;
}
.page.tv-mode :deep(.task-title) {
  font-size: 1.12rem;
}
.page.tv-mode :deep(.tv-pct) {
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--accent-strong, #2f6f56);
  white-space: nowrap;
}
.page.tv-mode :deep(.task-row) {
  cursor: default;
}
</style>
