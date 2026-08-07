<template>
  <div class="shell" :class="shellClass">
    <div v-if="isParentProxy" class="proxy-bar" role="status">
      <span>家长代登中 · 正在查看 {{ auth.user?.name }} 的今日</span>
      <el-button text type="primary" @click="exitProxy">退出代登</el-button>
    </div>
    <div v-if="offlinePending" class="offline-bar" role="status">
      <span>{{ offlinePending }} 条打卡待同步</span>
      <el-button text type="primary" :loading="syncing" @click="syncOffline">立即同步</el-button>
    </div>
    <div v-if="nudge" class="nudge-bar" role="status" aria-live="polite">
      <span>{{ nudge.fromName }}：{{ nudge.message }}</span>
      <el-button text type="primary" @click="nudge = null">知道了</el-button>
    </div>
    <div
      v-if="taskNotice"
      class="task-bar"
      role="status"
      aria-live="polite"
    >
      <button type="button" class="task-bar-main" @click="openTaskNotice">
        <span class="task-bar-label">新任务</span>
        <span class="task-bar-text">{{ taskNotice.title }}</span>
      </button>
      <el-button text type="primary" @click="openTaskNotice">去看看</el-button>
      <el-button text @click="snoozeTaskNotice">稍后</el-button>
    </div>
    <div v-if="pushHint" class="push-bar" role="status">
      <span>{{ pushHint }}</span>
      <el-button type="primary" text @click="enablePush">开启</el-button>
      <el-button text @click="dismissPushHint">暂不</el-button>
    </div>

    <template v-if="isPhone">
      <header class="top-bar">
        <div class="brand">学迹</div>
        <div class="user-chip">
          <span v-if="!hidePointsUi">{{ auth.user?.name }} · {{ auth.user?.pointsBalance ?? 0 }} {{ pointsUnit }}</span>
          <span v-else>{{ auth.user?.name }}</span>
          <el-button text @click="logout">退出</el-button>
        </div>
      </header>
      <main class="main shell-phone-pad">
        <CachedRouterView :include="[...STUDENT_KEEP_ALIVE]" />
      </main>
      <nav class="bottom-tabs" aria-label="学生导航">
        <router-link
          v-for="item in phoneNav"
          :key="item.to"
          class="tab-link"
          :to="item.to"
        >
          <span class="tab-ico">{{ item.icon }}</span>
          <span>{{ item.label }}</span>
        </router-link>
      </nav>
    </template>

    <template v-else-if="isTv">
      <header class="tv-top">
        <div class="brand tv-brand">学迹</div>
        <nav class="tv-nav" aria-label="学生客厅导航">
          <router-link
            v-for="item in tvNav"
            :key="item.to"
            class="nav-link tv-link"
            :to="item.to"
          >
            {{ item.label }}
          </router-link>
        </nav>
        <div class="user-chip">
          <span v-if="!hidePointsUi">{{ auth.user?.name }} · {{ auth.user?.pointsBalance ?? 0 }} {{ pointsUnit }}</span>
          <span v-else>{{ auth.user?.name }}</span>
          <el-button class="tap-btn" text @click="logout">退出</el-button>
        </div>
      </header>
      <p class="tv-hint muted" role="note">
        大屏适合看「下一件」；打卡、缓做请用手机。
      </p>
      <main class="main">
        <CachedRouterView :include="[...STUDENT_KEEP_ALIVE]" />
      </main>
    </template>

    <template v-else>
      <aside class="side">
        <div class="brand">学迹</div>
        <div v-if="!hidePointsUi" class="points">{{ auth.user?.pointsBalance ?? 0 }} {{ pointsUnit }}</div>
        <nav class="side-nav">
          <router-link
            v-for="item in sideNav"
            :key="item.to"
            class="nav-link"
            :to="item.to"
          >
            {{ item.label }}
          </router-link>
        </nav>
        <div class="side-foot">
          <div>{{ auth.user?.name }}</div>
          <el-button text @click="logout">退出</el-button>
        </div>
      </aside>
      <div class="content-wrap">
        <main class="main">
          <CachedRouterView :include="[...STUDENT_KEEP_ALIVE]" />
        </main>
      </div>
    </template>

    <OnboardingWizard
      :open="wizardOpen"
      :current="wizardCurrent"
      :total="2"
      :kicker="wizard.kicker"
      :title="wizard.title"
      :body="wizard.body"
      :bullets="wizard.bullets"
      :primary-label="wizard.primary"
      :secondary-label="wizard.secondary"
      skip-label="自己摸索"
      @primary="onWizardPrimary"
      @secondary="onWizardSecondary"
      @skip="onboard.skip()"
    />

    <SoftPrompt
      v-model="logoutOpen"
      kid-mode
      title="退出"
      :message="labels.logoutConfirm"
      confirm-text="退出"
      cancel-text="取消"
      :show-input="false"
      @confirm="onLogoutConfirm"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '../stores/auth'
import { useBreakpoint } from '../composables/useBreakpoint'
import { useSocket } from '../composables/useSocket'
import { ensurePushSubscription } from '../composables/useWebPush'
import {
  bumpTaskSync,
  bumpPactSync,
  type TaskAssignedNotice,
} from '../composables/taskSync'
import { useStudentOnboarding } from '../composables/useOnboarding'
import { labels } from '../composables/labels'
import { useFeatureFlags } from '../composables/useFeatureFlags'
import { pointsUnitLabel } from '../composables/pointsNarrative'
import {
  studentIntrinsicMode,
  shouldHidePointsUi,
} from '../composables/intrinsicMode'
import {
  flushOfflineQueue,
  offlineQueueCount,
  offlineQueueTick,
} from '../composables/offlineCheckinQueue'
import http from '../api/http'
import OnboardingWizard from '../components/OnboardingWizard.vue'
import SoftPrompt from '../components/SoftPrompt.vue'
import CachedRouterView from '../components/CachedRouterView.vue'
import { STUDENT_KEEP_ALIVE } from '../composables/keepAliveViews'

const AUTO_REFRESH_MS = 60_000

const auth = useAuthStore()
const logoutOpen = ref(false)
const router = useRouter()
const { isPhone, isTablet, isDesktop, isTv } = useBreakpoint()
const { on, connect } = useSocket()
const onboard = useStudentOnboarding()
const { flags, refresh: refreshFlags } = useFeatureFlags()
const ageBand = computed(
  () => localStorage.getItem('ageBand') || 'general',
)
const pointsUnit = computed(() => pointsUnitLabel(ageBand.value))
const hidePointsUi = computed(() => shouldHidePointsUi(studentIntrinsicMode.value))
const isParentProxy = computed(() => auth.isParentProxy())
const offlinePending = ref(0)
const syncing = ref(false)

function refreshOfflineCount() {
  offlinePending.value = offlineQueueCount()
}

async function syncOffline() {
  if (syncing.value || !navigator.onLine) return
  syncing.value = true
  try {
    const r = await flushOfflineQueue((payload) => http.post('/checkins', payload))
    refreshOfflineCount()
    if (r.ok) ElMessage.success(`已同步 ${r.ok} 条打卡`)
    if (r.dropped) {
      ElMessage.warning(
        `${r.dropped} 条打卡多次没同步上，请联网后重新打卡`,
      )
    } else if (r.fail) {
      ElMessage.warning(`${r.fail} 条暂未同步，稍后再试`)
    }
    bumpTaskSync()
  } finally {
    syncing.value = false
  }
}

function onOnline() {
  refreshOfflineCount()
  void syncOffline()
}

function onStorage(ev: StorageEvent) {
  if (ev.key === 'xueji.offlineCheckins') refreshOfflineCount()
}

watch(offlineQueueTick, refreshOfflineCount)
const nudge = ref<{ message: string; fromName: string } | null>(null)
const pushHint = ref('')
const taskNotice = ref<TaskAssignedNotice | null>(null)
let taskAutoTimer: ReturnType<typeof setTimeout> | null = null
/** Coalesce bursts of assign events into one soft refresh */
let pendingRefresh = false

/** Primary daily path: Today + Rewards; tasks/me under「更多」 */
const phoneNav = [
  { to: '/student/today', label: labels.studentToday, icon: '●' },
  { to: '/student/rewards', label: labels.studentRewards, icon: '★' },
  { to: '/student/more', label: labels.studentMore, icon: '⋯' },
]

/** P4：学生 TV 不铺配置导航，避免远距细打卡 */
const tvNav = [
  { to: '/student/today', label: labels.studentToday },
  { to: '/student/rewards', label: labels.studentRewards },
]

const sideNav = computed(() => {
  const items = [
    { to: '/student/today', label: labels.studentToday },
    { to: '/student/rewards', label: labels.studentRewards },
    { to: '/student/tasks', label: labels.studentTasks },
    { to: '/student/me', label: labels.studentMe },
  ]
  if (flags.allowance) {
    items.push({ to: '/student/allowance', label: labels.studentAllowance })
  }
  if (flags.pacts) {
    items.push({ to: '/student/pacts', label: labels.studentPacts })
  }
  return items
})

const wizardSteps = [
  {
    kicker: '第 1 步 · 共 2 步',
    title: '先看「下一件」',
    body: '每天打开学迹，最上面那一件就是现在最该做的。先做好眼前这一件就很好。',
    bullets: [
      '做完点「我做完了」——完成比分数更重要',
      '今天忙不过来，可以点「先缓缓」（次要操作）',
    ],
    primary: '好的，去今日',
    secondary: '下一步',
  },
  {
    kicker: '第 2 步 · 共 2 步',
    title: '做完会庆祝，休息也没关系',
    body: '提交后有时要等家长看一眼。休息日学习可以先不催；你也可以有自己的小计划。',
    bullets: [
      '庆祝先看「你做到了」，积分是顺便的',
      '愿望兑换时，积分会先交给家长保管',
    ],
    primary: '开始第一件',
    secondary: '完成引导',
  },
]

const wizardCurrent = computed(() => {
  const s = onboard.step.value
  return s === 'done' ? 1 : Number(s)
})
const wizardOpen = computed(() => onboard.active.value)
const wizard = computed(() => wizardSteps[Math.min(wizardCurrent.value, 1)])

function onWizardPrimary() {
  router.push('/student/today')
  if (wizardCurrent.value >= 1) onboard.setStep('done')
  else onboard.next()
}

function onWizardSecondary() {
  if (wizardCurrent.value >= 1) onboard.setStep('done')
  else onboard.next()
}

const shellClass = computed(() => ({
  'is-phone': isPhone.value,
  'is-tablet': isTablet.value,
  'is-desktop': isDesktop.value,
  'is-tv': isTv.value,
}))

async function logout() {
  if (isParentProxy.value) {
    exitProxy()
    return
  }
  logoutOpen.value = true
}

function onLogoutConfirm() {
  logoutOpen.value = false
  auth.logout()
  router.push('/login')
}

function exitProxy() {
  if (auth.exitParentProxy()) {
    ElMessage.success('已回到家长账号')
    router.push('/parent/students')
  } else {
    ElMessage.warning('代登状态已失效，请重新登录家长账号')
    router.push('/login')
  }
}

async function enablePush() {
  const res = await ensurePushSubscription()
  if (res.ok) {
    pushHint.value = ''
    ElMessage.success('已开启离屏提醒')
    localStorage.setItem('pushPromptDone', '1')
  } else if (res.reason === 'denied') {
    ElMessage.warning('浏览器拒绝了通知权限，可在设置里打开')
  } else if (res.reason === 'unsupported' || res.reason === 'disabled') {
    pushHint.value = ''
  } else {
    ElMessage.info('暂时无法开启推送，站内提醒仍可用')
  }
}

function dismissPushHint() {
  pushHint.value = ''
  localStorage.setItem('pushPromptDone', '1')
}

function clearTaskAutoTimer() {
  if (taskAutoTimer) {
    clearTimeout(taskAutoTimer)
    taskAutoTimer = null
  }
}

function scheduleTaskAutoRefresh() {
  clearTaskAutoTimer()
  pendingRefresh = true
  taskAutoTimer = setTimeout(() => {
    taskAutoTimer = null
    if (!pendingRefresh) return
    pendingRefresh = false
    taskNotice.value = null
    bumpTaskSync()
  }, AUTO_REFRESH_MS)
}

function dismissTaskNotice(syncNow: boolean) {
  clearTaskAutoTimer()
  pendingRefresh = false
  taskNotice.value = null
  if (syncNow) bumpTaskSync()
}

/** Hide banner but keep the 60s soft-refresh */
function snoozeTaskNotice() {
  taskNotice.value = null
}

function onTaskAssigned(payload: any) {
  if (!payload?.assignId || !payload?.taskId) return
  taskNotice.value = {
    taskId: Number(payload.taskId),
    assignId: Number(payload.assignId),
    title: String(payload.title || '新任务'),
    message: String(payload.message || `家长布置了新任务：${payload.title || ''}`),
    at: String(payload.at || new Date().toISOString()),
  }
  // 立即 soft-refresh 今日/任务列表；60s 后再清 banner 并二次同步
  bumpTaskSync()
  scheduleTaskAutoRefresh()
}

function onTaskUpdated(payload: any) {
  if (!payload?.taskId) return
  ElMessage.info(payload?.message || '任务已更新')
  bumpTaskSync()
}

function onTaskRemoved(payload: any) {
  if (!payload?.taskId) return
  const tid = Number(payload.taskId)
  if (taskNotice.value?.taskId === tid) {
    clearTaskAutoTimer()
    pendingRefresh = false
    taskNotice.value = null
  }
  ElMessage.info(payload?.message || '任务已取消')
  bumpTaskSync()
}

function openTaskNotice() {
  const n = taskNotice.value
  if (!n) return
  clearTaskAutoTimer()
  pendingRefresh = false
  const assignId = n.assignId
  taskNotice.value = null
  bumpTaskSync()
  router.push({
    path: '/student/today',
    query: { assignId: String(assignId) },
  })
}

onMounted(async () => {
  refreshOfflineCount()
  window.addEventListener('online', onOnline)
  window.addEventListener('storage', onStorage)
  connect()
  on('nudge:received', (payload: any) => {
    nudge.value = {
      message: payload?.message || '加油，下一件很快就好',
      fromName: payload?.fromName || '家长',
    }
  })
  const onPactEvent = (payload: any) => {
    nudge.value = {
      message: payload?.message || '积分约定有更新',
      fromName: '积分约定',
    }
    void auth.fetchMe()
    bumpPactSync()
  }
  const onGiftEvent = (payload: any) => {
    nudge.value = {
      message: payload?.message || '积分心意有更新',
      fromName: '积分心意',
    }
    void auth.fetchMe()
    bumpPactSync()
  }
  on('pact:pending', onPactEvent)
  on('pact:accepted', onPactEvent)
  on('pact:rejected', onPactEvent)
  on('pact:repaid', onPactEvent)
  on('pact:parent_approved', onPactEvent)
  on('pact:parent_rejected', onPactEvent)
  on('gift:pending', onGiftEvent)
  on('gift:parent_pending', onGiftEvent)
  on('gift:completed', onGiftEvent)
  on('gift:cancelled', onGiftEvent)
  on('family:settings', () => {
    void refreshFlags()
    bumpTaskSync()
  })
  on('task:assigned', onTaskAssigned)
  on('task:updated', onTaskUpdated)
  on('task:removed', onTaskRemoved)
  on('checkin:confirmed', async (payload: any) => {
    if (typeof payload?.pointsAwarded === 'number' && payload.pointsAwarded > 0) {
      await auth.fetchMe()
    }
    const liked = !!payload?.liked
    const comment = String(payload?.parentComment || '').trim()
    const taskTitle = String(payload?.taskTitle || '').trim()
    let message = ''
    if (comment) {
      message = comment
    } else if (payload?.message) {
      message = String(payload.message)
    } else if (liked) {
      message = taskTitle
        ? `看见你完成了「${taskTitle}」，真棒`
        : '认真完成的样子，家长看见了'
    } else {
      message = '家长已看过你的完成记录'
    }
    nudge.value = {
      message,
      fromName: liked ? '家长点赞' : comment ? '家长说' : '家长',
    }
    bumpTaskSync()
  })
  on('redeem:reviewed', async (payload: any) => {
    ElMessage.success(payload?.message || '兑换状态有更新')
    if (typeof payload?.pointsBalance === 'number') {
      await auth.fetchMe()
    }
    nudge.value = {
      message: payload?.message || '兑换状态有更新',
      fromName: payload?.wishType === 'golden_finger' ? '家庭互助卡' : '学迹',
    }
    if (payload?.effectType === 'chore_waiver' || payload?.status) {
      bumpTaskSync()
    }
  })

  // Soft prompt once: enable Web Push for parent nudges when offline
  if (!localStorage.getItem('pushPromptDone') && !isTv.value) {
    const metaOk = 'Notification' in window && 'serviceWorker' in navigator
    if (metaOk && Notification.permission === 'default') {
      pushHint.value = '开启通知后，家长轻轻提醒时即使不在页面也能收到'
    } else if (metaOk && Notification.permission === 'granted') {
      await ensurePushSubscription()
      localStorage.setItem('pushPromptDone', '1')
    }
  } else if (Notification.permission === 'granted') {
    void ensurePushSubscription()
  }
})

onUnmounted(() => {
  window.removeEventListener('online', onOnline)
  window.removeEventListener('storage', onStorage)
  clearTaskAutoTimer()
})
</script>

<style scoped>
.shell {
  min-height: 100vh;
}
.shell.is-tablet,
.shell.is-desktop {
  display: grid;
  grid-template-columns: var(--nav-w) 1fr;
}
.shell.is-tablet .nudge-bar,
.shell.is-desktop .nudge-bar,
.shell.is-tablet .task-bar,
.shell.is-desktop .task-bar,
.shell.is-tablet .push-bar,
.shell.is-desktop .push-bar {
  grid-column: 1 / -1;
}
.nudge-bar,
.offline-bar,
.proxy-bar,
.task-bar,
.push-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 10px 14px;
  background: var(--accent-soft);
  border-bottom: 1px solid rgba(47, 111, 78, 0.12);
  font-size: 0.95rem;
}
.nudge-bar {
  background: linear-gradient(90deg, #fff6e8 0%, var(--accent-soft) 100%);
}
.proxy-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 12px;
  background: #fff8e8;
  border-bottom: 1px solid #f0e2c0;
  font-size: 0.9rem;
}
.offline-bar {
  background: #fff8e8;
  border-bottom-color: rgba(180, 140, 40, 0.2);
}
.task-bar {
  background: #eef6f1;
  border-bottom-color: rgba(47, 111, 78, 0.18);
}
.task-bar-main {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  border: 0;
  background: transparent;
  padding: 0;
  text-align: left;
  cursor: pointer;
  font: inherit;
  color: inherit;
}
.task-bar-label {
  flex-shrink: 0;
  font-weight: 700;
  color: var(--accent-strong);
}
.task-bar-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.push-bar {
  background: #fff8e8;
  border-bottom-color: rgba(180, 140, 40, 0.2);
}
.top-bar,
.tv-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 16px;
  padding-top: calc(12px + env(safe-area-inset-top, 0px));
  background: rgba(255, 255, 255, 0.92);
  border-bottom: 1px solid var(--line);
  position: sticky;
  top: 0;
  z-index: 20;
}
.brand {
  font-weight: 800;
  color: var(--accent);
  font-size: 1.25rem;
  font-family: var(--font-display);
}
.tv-brand {
  font-size: 1.7rem;
}
.points {
  color: #a9c0b4;
  padding: 0 12px 14px;
  font-size: 0.95rem;
}
.user-chip {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--muted);
  font-size: 0.9rem;
}
.side {
  background: var(--side);
  color: var(--side-text);
  padding: 20px 12px;
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  position: sticky;
  top: 0;
}
.side .brand {
  color: var(--side-text);
  padding: 8px 12px 8px;
}
.side-nav {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.nav-link {
  padding: 12px 14px;
  border-radius: 12px;
  color: #cfe0d6;
  min-height: var(--tap-min);
  display: flex;
  align-items: center;
}
.nav-link.router-link-active {
  background: var(--accent);
  color: #fff;
  font-weight: 700;
}
.side-foot {
  margin-top: auto;
  padding: 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: #a9c0b4;
}
.main,
.content-wrap {
  min-width: 0;
}
.bottom-tabs {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  background: #fff;
  border-top: 1px solid var(--line);
  padding: 6px 4px calc(6px + env(safe-area-inset-bottom, 0px));
  z-index: 30;
}
.tab-link {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  min-height: 56px;
  color: var(--muted);
  font-size: 0.82rem;
  border-radius: 12px;
}
.tab-link.router-link-active {
  color: var(--accent);
  background: var(--accent-soft);
  font-weight: 700;
}
.tv-top {
  padding: 18px 28px;
}
.tv-hint {
  margin: 0;
  padding: 8px 28px 0;
  font-size: 1rem;
  text-align: center;
}
.tv-nav {
  display: flex;
  gap: 10px;
  flex: 1;
  justify-content: center;
  flex-wrap: wrap;
}
.tv-link {
  padding: 14px 22px;
  font-size: 1.2rem;
  color: var(--ink);
  background: #fff;
  border: 1px solid var(--line);
}
.tv-link.router-link-active {
  background: var(--accent);
  color: #fff;
  border-color: var(--accent);
}
</style>
