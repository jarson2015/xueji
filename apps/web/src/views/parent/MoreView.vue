<template>
  <div class="page">
    <h2 class="page-title">{{ labels.parentFamily }}</h2>
    <p class="lead muted">
      回顾与约定在此；日常用底部{{ labels.parentMonitor }} / {{ labels.parentTasks }}。
    </p>

    <section class="more-section" aria-labelledby="more-notify">
      <h3 id="more-notify" class="section-label">提醒</h3>
      <div class="card-panel notify-card">
        <div>
          <h3>离屏提醒</h3>
          <p class="muted">孩子待确认打卡、兑换愿望或提议小事时，离开页面也能收到</p>
        </div>
        <el-button type="primary" class="tap-btn" :loading="pushBusy" @click="enablePush">
          开启通知
        </el-button>
      </div>
    </section>

    <section class="more-section" aria-labelledby="more-review">
      <h3 id="more-review" class="section-label">回顾</h3>
      <div
        class="card-panel link-card"
        role="button"
        tabindex="0"
        @click="$router.push('/parent/journal')"
        @keydown.enter="$router.push('/parent/journal')"
      >
        <div>
          <h3>
            {{ journalTitle }}
            <el-badge
              v-if="journalNewReplies > 0"
              :value="journalNewReplies"
              class="journal-badge"
            />
          </h3>
          <p class="muted">全家动态与回应 · 不计分</p>
        </div>
        <span class="arrow">›</span>
      </div>
      <div
        class="card-panel link-card"
        role="button"
        tabindex="0"
        @click="$router.push('/parent/weekend-meeting')"
        @keydown.enter="$router.push('/parent/weekend-meeting')"
      >
        <div>
          <h3>周末小会</h3>
          <p class="muted">{{ weekendMeetingHint }}</p>
        </div>
        <span class="arrow">›</span>
      </div>
      <div
        class="card-panel link-card"
        role="button"
        tabindex="0"
        @click="$router.push('/parent/reports')"
        @keydown.enter="$router.push('/parent/reports')"
      >
        <div>
          <h3>{{ labels.parentReports }}</h3>
          <p class="muted">高光回顾，和还想一起完成的</p>
        </div>
        <span class="arrow">›</span>
      </div>
      <div
        class="card-panel link-card"
        role="button"
        tabindex="0"
        @click="$router.push('/parent/growth?tab=portfolio')"
        @keydown.enter="$router.push('/parent/growth?tab=portfolio')"
      >
        <div>
          <h3>成长作品集</h3>
          <p class="muted">本周主题、照片与里程碑，看见过程</p>
        </div>
        <span class="arrow">›</span>
      </div>
    </section>

    <section class="more-section" aria-labelledby="more-incentive">
      <h3 id="more-incentive" class="section-label">激励</h3>
      <div
        class="card-panel link-card"
        role="button"
        tabindex="0"
        @click="$router.push('/parent/wishes')"
        @keydown.enter="$router.push('/parent/wishes')"
      >
        <div>
          <h3>{{ labels.parentWishes }}</h3>
          <p class="muted">设置愿望、和孩子一起兑现</p>
        </div>
        <span class="arrow">›</span>
      </div>
    </section>

    <section class="more-section" aria-labelledby="more-pact">
      <h3 id="more-pact" class="section-label">约定</h3>
      <div
        class="card-panel link-card"
        role="button"
        tabindex="0"
        @click="$router.push('/parent/rest-days')"
        @keydown.enter="$router.push('/parent/rest-days')"
      >
        <div>
          <h3>{{ labels.parentRestDays }}</h3>
          <p class="muted">休息日、暂停范围、补上进度</p>
        </div>
        <span class="arrow">›</span>
      </div>
      <div
        class="card-panel link-card"
        role="button"
        tabindex="0"
        @click="$router.push('/parent/family-edu')"
        @keydown.enter="$router.push('/parent/family-edu')"
      >
        <div>
          <h3>{{ labels.parentFamilyEdu }}</h3>
          <p class="muted">常用：加分与作息；进阶与零花约定可折叠</p>
        </div>
        <span class="arrow">›</span>
      </div>
      <div
        class="card-panel link-card"
        role="button"
        tabindex="0"
        @click="$router.push('/parent/covenant')"
        @keydown.enter="$router.push('/parent/covenant')"
      >
        <div>
          <h3>{{ labels.parentCovenant }}</h3>
          <p class="muted">规则看得见，孩子也能一起守</p>
        </div>
        <span class="arrow">›</span>
      </div>
      <div class="money-fold">
        <button type="button" class="money-fold-toggle" @click="moneyOpen = !moneyOpen">
          <span>
            <strong>零花钱与积分约定</strong>
            <span class="muted tiny">可选功能</span>
          </span>
          <span class="muted">{{ moneyOpen ? '收起' : '展开' }}</span>
        </button>
        <div v-if="moneyOpen" class="money-fold-body">
          <div
            class="card-panel link-card"
            :class="{ dim: !flags.allowance }"
            role="button"
            tabindex="0"
            @click="openFeature('/parent/allowance', flags.allowance)"
            @keydown.enter="openFeature('/parent/allowance', flags.allowance)"
          >
            <div>
              <h3>{{ labels.parentAllowance }}</h3>
              <p class="muted">
                {{
                  flags.allowance
                    ? '余额、大额确认、发零花钱'
                    : '未开启 · 点此去教育设置打开'
                }}
              </p>
            </div>
            <span class="arrow">›</span>
          </div>
          <div
            class="card-panel link-card"
            :class="{ dim: !flags.pacts }"
            role="button"
            tabindex="0"
            @click="openFeature('/parent/pacts', flags.pacts)"
            @keydown.enter="openFeature('/parent/pacts', flags.pacts)"
          >
            <div>
              <h3>{{ labels.parentPacts }}</h3>
              <p class="muted">
                {{
                  flags.pacts
                    ? '兄妹借用积分、按约定还回（不是钱）'
                    : '未开启 · 点此去教育设置打开'
                }}
              </p>
            </div>
            <span class="arrow">›</span>
          </div>
        </div>
      </div>
    </section>

    <!-- U4.4：客厅导航状态露在折叠外，避免误藏 -->
    <section class="more-section" aria-labelledby="more-living">
      <h3 id="more-living" class="section-label">客厅</h3>
      <div class="card-panel living-nav-card">
        <div class="living-nav-row">
          <div>
            <strong>{{ livingNavOn ? LIVING_ROOM_COPY.statusOn : LIVING_ROOM_COPY.statusOff }}</strong>
            <p class="muted tiny" style="margin: 4px 0 0">{{ LIVING_ROOM_COPY.hint }}</p>
          </div>
          <el-button
            v-if="!livingNavOn"
            type="primary"
            class="tap-btn"
            @click="enableLivingRoom"
          >
            {{ LIVING_ROOM_COPY.enable }}
          </el-button>
          <el-button v-else class="tap-btn" @click="disableLivingRoom">
            {{ LIVING_ROOM_COPY.disable }}
          </el-button>
        </div>
      </div>
      <div
        class="card-panel link-card ritual-card"
        role="button"
        tabindex="0"
        @click="$router.push('/ritual')"
        @keydown.enter="$router.push('/ritual')"
      >
        <div>
          <h3>客厅仪式屏</h3>
          <p class="muted">投屏看今日节奏与周末小会（不是配任务）</p>
        </div>
        <span class="arrow">›</span>
      </div>
    </section>

    <section class="more-section" aria-labelledby="more-other">
      <h3 id="more-other" class="section-label">其它</h3>
      <div
        class="card-panel link-card"
        role="button"
        tabindex="0"
        @click="$router.push('/parent/archive')"
        @keydown.enter="$router.push('/parent/archive')"
      >
        <div>
          <h3>已放下的任务</h3>
          <p class="muted">日终归档与共享完成记录</p>
        </div>
        <span class="arrow">›</span>
      </div>
      <div class="money-fold more-optional-fold">
        <button type="button" class="money-fold-toggle" @click="optionalOpen = !optionalOpen">
          <span>
            <strong>可选入口</strong>
            <span class="muted tiny">小贴士 · 减负</span>
          </span>
          <span class="muted">{{ optionalOpen ? '收起' : '展开' }}</span>
        </button>
        <div v-if="optionalOpen" class="money-fold-body">
          <div
            class="card-panel link-card"
            role="button"
            tabindex="0"
            @click="$router.push('/parent/family-edu#edu-tips')"
            @keydown.enter="$router.push('/parent/family-edu#edu-tips')"
          >
            <div>
              <h3>教育小贴士与自检</h3>
              <p class="muted">分龄微课 · 关系自检（自愿、不算分）</p>
            </div>
            <span class="arrow">›</span>
          </div>
          <div
            class="card-panel link-card"
            role="button"
            tabindex="0"
            @click="helpResourcesOpen = true"
            @keydown.enter="helpResourcesOpen = true"
          >
            <div>
              <h3>减负与求助</h3>
              <p class="muted">静态资源 · 非诊疗 · 不会自动报警</p>
            </div>
            <span class="arrow">›</span>
          </div>
        </div>
      </div>
    </section>
  </div>

  <SoftPrompt
    v-model="helpResourcesOpen"
    :title="HELP_RESOURCES_TITLE"
    :message="HELP_RESOURCES_BODY"
    confirm-text="知道了"
    cancel-text="关闭"
    :show-input="false"
    @confirm="helpResourcesOpen = false"
    @cancel="helpResourcesOpen = false"
  />
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import http from '../../api/http'
import { labels } from '../../composables/labels'
import { journalProductName } from '../../composables/journalLabels'
import { useFeatureFlags } from '../../composables/useFeatureFlags'
import { isTvModeOptIn, setTvModeOptIn } from '../../composables/useBreakpoint'
import { ensurePushSubscription } from '../../composables/useWebPush'
import { isWeekendRitualDay } from '../../composables/weekendRitualDay'
import { LIVING_ROOM_COPY } from '../../composables/livingRoomCopy'
import {
  HELP_RESOURCES_BODY,
  HELP_RESOURCES_TITLE,
} from '../../composables/teenPrivacy'
import SoftPrompt from '../../components/SoftPrompt.vue'

const router = useRouter()
const { flags } = useFeatureFlags()
const moneyOpen = ref(false)
/** U3.3：小贴士 / 减负默认折叠 */
const optionalOpen = ref(false)
const helpResourcesOpen = ref(false)
const livingNavTick = ref(0)
const livingNavOn = computed(() => {
  livingNavTick.value
  return isTvModeOptIn()
})
const pushBusy = ref(false)
const journalNewReplies = ref(0)
/** 家长侧固定家庭说说 */
const journalTitle = journalProductName('general')

onMounted(async () => {
  try {
    const data: any = await http.get('/journal/activity-hint')
    journalNewReplies.value = Number(data?.newReplyCount || 0)
  } catch {
    journalNewReplies.value = 0
  }
})

async function enablePush() {
  pushBusy.value = true
  try {
    const res = await ensurePushSubscription()
    if (res.ok) {
      localStorage.removeItem('xueji.parentPushHintDismissed')
      ElMessage.success('已开启离屏提醒')
    } else if (res.reason === 'denied') {
      ElMessage.warning('浏览器拦住了通知，可在地址栏权限里允许后再试')
    } else if (res.reason === 'disabled') {
      ElMessage.info('当前环境未开启推送')
    } else if (res.reason === 'unsupported') {
      ElMessage.info('当前浏览器不支持通知')
    } else {
      ElMessage.warning('提醒没开成功，稍后再试')
    }
  } finally {
    pushBusy.value = false
  }
}

function enableLivingRoom() {
  setTvModeOptIn(true)
  livingNavTick.value += 1
  ElMessage.success(LIVING_ROOM_COPY.enabledToast)
}

function disableLivingRoom() {
  setTvModeOptIn(false)
  livingNavTick.value += 1
  ElMessage.success(LIVING_ROOM_COPY.disabledToast)
}

/** 周五–日加强周末小会副文案（本地星期，无 API） */
const weekendMeetingHint = computed(() => {
  if (isWeekendRitualDay()) {
    return '这周可以开小会了 · 骄傲 · 改一件 · 陪伴'
  }
  return '骄傲 · 改一件 · 陪伴承诺'
})

function openFeature(path: string, enabled: boolean) {
  if (enabled) {
    router.push(path)
    return
  }
  ElMessage.info('请先在「教育设置」里打开此功能')
  router.push('/parent/family-edu')
}
</script>

<style scoped>
.lead {
  margin: -4px 0 14px;
}
.more-section {
  margin-bottom: 18px;
}
.section-label {
  margin: 0 0 8px;
  font-size: 0.78rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: none;
  color: var(--muted);
}
.link-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  min-height: var(--tap-min);
  transition: transform 0.2s ease;
  margin-bottom: 8px;
}
.link-card.dim {
  opacity: 0.72;
}
.link-card:hover {
  transform: translateY(-1px);
}
.link-card h3 {
  margin: 0 0 4px;
  font-family: var(--font-display);
}
.journal-badge {
  margin-left: 6px;
  vertical-align: middle;
}
.arrow {
  font-size: 1.6rem;
  color: var(--muted);
}
.money-fold {
  grid-column: 1 / -1;
  margin-bottom: 8px;
}
.money-fold-toggle {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  border: 1px dashed var(--line);
  background: transparent;
  border-radius: var(--radius, 12px);
  padding: 12px 14px;
  cursor: pointer;
  text-align: left;
  min-height: var(--tap-min);
}
.money-fold-toggle .tiny {
  display: block;
  margin-top: 2px;
  font-size: 0.8rem;
  font-weight: 400;
}
.money-fold-body {
  margin-top: 8px;
}
.living-nav-card {
  border-color: color-mix(in srgb, var(--accent, #2f6f4e) 28%, var(--line));
  background: linear-gradient(160deg, #f3faf6 0%, #fff 80%);
}
.living-nav-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}
.notify-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.notify-card h3 {
  margin: 0 0 4px;
}

@media (min-width: 768px) {
  .more-section {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px 12px;
    align-items: stretch;
  }
  .section-label {
    grid-column: 1 / -1;
  }
}
</style>
