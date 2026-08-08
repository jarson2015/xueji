<template>
  <div class="shell" :class="shellClass">
    <div v-if="pushHint" class="push-bar" role="status">
      <span>{{ pushHint }}</span>
      <el-button text type="primary" @click="enablePush">开启</el-button>
      <el-button text @click="dismissPushHint">暂不</el-button>
    </div>
    <template v-if="isPhone">
      <header class="top-bar">
        <div class="brand">学迹 · 家长</div>
        <div class="user-chip">
          <span>{{ auth.user?.name }}</span>
          <el-button text @click="logout">退出</el-button>
        </div>
      </header>
      <main class="main shell-phone-pad">
        <CachedRouterView :include="[...PARENT_KEEP_ALIVE]" />
      </main>
      <nav class="bottom-tabs" aria-label="家长导航">
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
        <nav class="tv-nav" aria-label="客厅导航">
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
          <span>{{ auth.user?.name }}</span>
          <el-button class="tap-btn" text @click="logout">退出</el-button>
        </div>
      </header>
      <p v-if="showLivingRoomBar" class="tv-living-bar muted" role="status">
        {{ LIVING_ROOM_COPY.statusBar }}
        <button type="button" class="tv-living-link" @click="goRestoreNav">
          {{ LIVING_ROOM_COPY.restoreShort }}
        </button>
      </p>
      <main class="main">
        <CachedRouterView :include="[...PARENT_KEEP_ALIVE]" />
      </main>
    </template>

    <template v-else>
      <aside class="side">
        <div class="brand">学迹 · 家长</div>
        <nav class="side-nav">
          <div class="nav-group">日常</div>
          <router-link
            v-for="item in primaryNav"
            :key="item.to"
            class="nav-link"
            :to="item.to"
          >
            {{ item.label }}
          </router-link>
          <div class="nav-group">家庭</div>
          <router-link
            v-for="item in familyNav"
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
      <main class="main">
        <CachedRouterView :include="[...PARENT_KEEP_ALIVE]" />
      </main>
    </template>

    <OnboardingWizard
      :open="wizardOpen"
      :current="wizardCurrent"
      :total="4"
      :kicker="wizard.kicker"
      :title="wizard.title"
      :body="wizard.body"
      :bullets="wizard.bullets"
      :primary-label="wizard.primary"
      :secondary-label="wizard.secondary"
      skip-label="稍后再说"
      @primary="onWizardPrimary"
      @secondary="onWizardSecondary"
      @skip="onboard.skip()"
    />

    <div v-if="coNotice" class="co-bar" role="status" aria-live="polite">
      <span>{{ coNotice.fromName }}：{{ coNotice.message }}</span>
      <el-button text type="primary" @click="coNotice = null">知道了</el-button>
    </div>

    <SoftPrompt
      v-model="logoutOpen"
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
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '../stores/auth'
import { setTvModeOptIn, useBreakpoint } from '../composables/useBreakpoint'
import { LIVING_ROOM_COPY } from '../composables/livingRoomCopy'
import { useParentOnboarding } from '../composables/useOnboarding'
import { useSocket } from '../composables/useSocket'
import OnboardingWizard from '../components/OnboardingWizard.vue'
import SoftPrompt from '../components/SoftPrompt.vue'
import CachedRouterView from '../components/CachedRouterView.vue'
import http from '../api/http'

import { labels } from '../composables/labels'
import { PARENT_KEEP_ALIVE } from '../composables/keepAliveViews'
import { useFeatureFlags } from '../composables/useFeatureFlags'
import { ensurePushSubscription } from '../composables/useWebPush'
import {
  bumpPactSync,
  bumpCovenantSync,
  bumpTaskSync,
} from '../composables/taskSync'

const auth = useAuthStore()
const router = useRouter()
const { isPhone, isTablet, isDesktop, isTv } = useBreakpoint()
const onboard = useParentOnboarding()
const { connect, on } = useSocket()
const { flags, refresh: refreshFlags } = useFeatureFlags()
const coNotice = ref<{ message: string; fromName: string } | null>(null)
const logoutOpen = ref(false)
const pushHint = ref('')

async function enablePush() {
  const res = await ensurePushSubscription()
  if (res.ok) {
    pushHint.value = ''
    ElMessage.success('已开启离屏提醒')
  } else if (res.reason === 'denied') {
    pushHint.value = '浏览器拦住了通知，可在地址栏权限里允许后再试'
  } else if (res.reason === 'disabled') {
    pushHint.value = ''
    ElMessage.info('当前环境未开启推送')
  } else if (res.reason === 'unsupported') {
    pushHint.value = ''
    ElMessage.info('当前浏览器不支持通知')
  } else {
    pushHint.value = '提醒没开成功，稍后再试'
  }
}

function dismissPushHint() {
  pushHint.value = ''
  localStorage.setItem('xueji.parentPushHintDismissed', '1')
}

const phoneNav = [
  { to: '/parent/monitor', label: labels.parentMonitor, icon: '▣' },
  { to: '/parent/tasks', label: labels.parentTasks, icon: '☰' },
  { to: '/parent/students', label: labels.parentStudents, icon: '◎' },
  { to: '/parent/more', label: labels.parentFamily, icon: '⋯' },
]

const primaryNav = [
  { to: '/parent/monitor', label: labels.parentMonitor },
  { to: '/parent/students', label: labels.parentStudents },
  { to: '/parent/tasks', label: labels.parentTasks },
]

const familyNav = computed(() => {
  const items = [
    { to: '/parent/wishes', label: labels.parentWishes },
    { to: '/parent/reports', label: labels.parentReports },
    { to: '/parent/growth', label: labels.parentGrowth },
    { to: '/parent/weekend-meeting', label: labels.parentWeekend },
    { to: '/parent/rest-days', label: labels.parentRestDays },
    { to: '/parent/family-edu', label: labels.parentFamilyEdu },
    { to: '/parent/covenant', label: labels.parentCovenant },
  ]
  if (flags.allowance) {
    items.push({ to: '/parent/allowance', label: labels.parentAllowance })
  }
  if (flags.pacts) {
    items.push({ to: '/parent/pacts', label: labels.parentPacts })
  }
  return items
})

/** P4：客厅 TV 只留扫一眼入口，精细配置走「更多」或手机 */
const tvNav = [
  { to: '/parent/monitor', label: '今天怎么样' },
  { to: '/ritual', label: '客厅仪式屏' },
  { to: '/parent/more', label: '更多' },
]

/** U4.4：显式客厅壳时提示可恢复（isTv 仅 opt-in） */
const showLivingRoomBar = computed(() => isTv.value)

function goRestoreNav() {
  setTvModeOptIn(false)
  ElMessage.success(LIVING_ROOM_COPY.disabledToast)
  router.push('/parent/more')
}

const wizardSteps = [
  {
    kicker: '第 1 步 · 共 4 步',
    title: '先添加孩子',
    body: '生成登录码后，孩子用 6 位数字就能进入「今日」。',
    bullets: ['姓名随便填，之后还能改', '登录码可以随时刷新'],
    primary: '去添加孩子',
    secondary: '已有孩子，下一步',
    primaryTo: '/parent/students',
  },
  {
    kicker: '第 2 步 · 共 4 步',
    title: '把登录码给孩子',
    body: '在学生卡片上点「复制登录码」，发给孩子或当面输入。',
    bullets: ['孩子打开学迹 → 选学生登录', '输入 6 位数字即可'],
    primary: '打开学生页复制',
    secondary: '下一步',
    primaryTo: '/parent/students',
  },
  {
    kicker: '第 3 步 · 共 4 步',
    title: '布置一件小事',
    body: '选一个今天就能完成的小任务。先少一点，比一次铺满更重要。',
    bullets: [
      '先 1～2 个微习惯就好（2–5 分钟）',
      '家务/习惯建议关掉「需确认」',
      '多孩家务可开「共享完成 + 按天轮值」',
    ],
    primary: '去发布任务',
    secondary: '下一步',
    primaryTo: '/parent/tasks',
  },
  {
    kicker: '第 4 步 · 共 4 步',
    title: '定下家庭约定（可选）',
    body: '休息日学习可放松；积分不必每次都发——习惯稳了可以淡出，保护内在动机。',
    bullets: [
      '先只开任务+打卡+愿望也完全够用',
      '坚持约一周后，可在教育设置里试试「随机强化」',
    ],
    primary: '去教育设置',
    secondary: '完成引导',
    primaryTo: '/parent/family-edu',
  },
]

const wizardCurrent = computed(() => {
  const s = onboard.step.value
  return s === 'done' ? 3 : Number(s)
})

const wizardOpen = computed(() => onboard.active.value)

const wizard = computed(() => wizardSteps[Math.min(wizardCurrent.value, 3)])

function onWizardPrimary() {
  const i = wizardCurrent.value
  const step = wizardSteps[i]
  if (step?.primaryTo) router.push(step.primaryTo)
  if (i >= 3) onboard.setStep('done')
  else onboard.next()
}

function onWizardSecondary() {
  if (wizardCurrent.value >= 3) onboard.setStep('done')
  else onboard.next()
}

const shellClass = computed(() => ({
  'is-phone': isPhone.value,
  'is-tablet': isTablet.value,
  'is-desktop': isDesktop.value,
  'is-tv': isTv.value,
}))

function logout() {
  logoutOpen.value = true
}

function onLogoutConfirm() {
  logoutOpen.value = false
  auth.logout()
  router.push('/login')
}

onMounted(async () => {
  connect()
  on('family:co-parent', (payload: any) => {
    coNotice.value = {
      message: payload?.message || '家庭有新的重要操作',
      fromName: payload?.fromName || '另一位家长',
    }
    void refreshFlags()
  })
  on('family:settings', () => {
    void refreshFlags()
    bumpTaskSync()
  })
  const onPactEvent = () => {
    bumpPactSync()
  }
  on('pact:parent_pending', onPactEvent)
  on('pact:pending', onPactEvent)
  on('pact:accepted', onPactEvent)
  on('pact:repaid', onPactEvent)
  on('pact:parent_approved', onPactEvent)
  on('pact:parent_rejected', onPactEvent)
  on('gift:parent_pending', onPactEvent)
  on('gift:pending', onPactEvent)
  on('gift:completed', onPactEvent)
  on('gift:cancelled', onPactEvent)
  on('covenant:proposed', (payload: any) => {
    bumpCovenantSync()
    ElMessage.info(payload?.message || '孩子提了一条公约建议')
  })
  on('task:proposed', (payload: any) => {
    bumpTaskSync()
    ElMessage.info(payload?.message || '孩子想加一件小事')
  })
  if (
    typeof Notification !== 'undefined' &&
    Notification.permission === 'default' &&
    localStorage.getItem('xueji.parentPushHintDismissed') !== '1'
  ) {
    pushHint.value = '开启通知后，孩子打卡待确认或兑换时，离开页面也能收到'
  } else if (
    typeof Notification !== 'undefined' &&
    Notification.permission === 'granted'
  ) {
    void ensurePushSubscription()
  }
  if (onboard.active.value) {
    try {
      const [students, tasks] = await Promise.all([
        http.get('/students') as Promise<any[]>,
        http.get('/tasks') as Promise<any[]>,
      ])
      onboard.syncFromData({
        hasStudents: (students || []).length > 0,
        hasTasks: (tasks || []).length > 0,
      })
    } catch {
      // keep default wizard step
    }
  }
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
.shell.is-tablet .push-bar,
.shell.is-desktop .push-bar {
  grid-column: 1 / -1;
}
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
  font-size: 1.15rem;
  font-family: var(--font-display);
}
.tv-brand {
  font-size: 1.6rem;
}
.tv-living-bar {
  margin: 0;
  padding: 8px 16px;
  font-size: 0.9rem;
  background: var(--accent-soft, #d8ebe0);
  color: var(--accent-strong, #1f4d36);
  border-bottom: 1px solid rgba(47, 111, 78, 0.12);
}
.tv-living-link {
  margin-left: 8px;
  border: none;
  background: none;
  padding: 0;
  font: inherit;
  color: var(--accent-strong, #1f4d36);
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 2px;
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
  padding: 8px 12px 18px;
}
.side-nav {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.nav-group {
  padding: 14px 14px 4px;
  font-size: 0.75rem;
  letter-spacing: 0.06em;
  color: #7a9488;
  text-transform: none;
}
.nav-link {
  display: flex;
  align-items: center;
  padding: 12px 14px;
  border-radius: 12px;
  color: #cfe0d6;
  min-height: var(--tap-min);
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
.main {
  min-width: 0;
}
.bottom-tabs {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
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
.tab-ico {
  font-size: 1rem;
  line-height: 1;
}
.tv-top {
  padding: 18px 28px;
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
.co-bar {
  position: fixed;
  left: 12px;
  right: 12px;
  bottom: calc(72px + env(safe-area-inset-bottom, 0px));
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 12px 14px;
  background: #fff8e8;
  border: 1px solid var(--warm-line);
  border-radius: 14px;
  box-shadow: 0 8px 24px rgba(28, 43, 36, 0.12);
}
.shell.is-tablet .co-bar,
.shell.is-desktop .co-bar,
.shell.is-tv .co-bar {
  bottom: 24px;
  max-width: 520px;
  margin: 0 auto;
}
</style>
