<template>
  <div class="page">
    <PageSkeleton v-if="loading" :rows="4" />
    <template v-else>
    <h2 class="page-title">{{ labels.studentMe }}</h2>
    <div class="card-panel soft-balance profile">
      <div class="balance-row">
        <span class="muted">{{ auth.user?.name }} 的{{ pointsUnit }}</span>
        <strong class="balance-num">{{ auth.user?.pointsBalance ?? 0 }}</strong>
      </div>
    </div>

    <div
      class="card-panel link-card growth-link"
      role="button"
      tabindex="0"
      @click="$router.push('/student/growth?tab=portfolio')"
      @keydown.enter="$router.push('/student/growth?tab=portfolio')"
    >
      <div>
        <h3 style="margin: 0">我的成长作品集</h3>
        <p class="muted tiny" style="margin: 4px 0 0">照片、里程碑与本周主题</p>
      </div>
      <span class="arrow">›</span>
    </div>

    <div class="card-panel">
      <div class="page-head" style="margin-bottom: 8px">
        <h3 style="margin: 0">本周主题</h3>
        <el-button type="primary" class="tap-btn" :loading="goalSaving" @click="saveGoal">
          保存
        </el-button>
      </div>
      <p class="muted tiny plan-hint">
        选一个主题 + 一句小目标。会出现在「今日」和周末小会。
      </p>
      <div class="theme-chips" style="margin-bottom: 10px">
        <button
          v-for="p in THEME_WEEK_PRESETS"
          :key="p.code"
          type="button"
          class="theme-chip"
          :class="{ on: themePresetDraft === p.code }"
          @click="onMePickTheme(p.code)"
        >
          {{ p.title }}
        </button>
      </div>
      <el-input
        v-if="themePresetDraft === 'custom'"
        v-model="themeTitleDraft"
        maxlength="40"
        show-word-limit
        size="large"
        placeholder="自定义主题标题"
        style="margin-bottom: 10px"
      />
      <el-input
        v-model="weeklyGoalDraft"
        maxlength="80"
        show-word-limit
        size="large"
        placeholder="例如：这周把英语阅读坚持五天"
      />
    </div>

    <div class="card-panel">
      <div class="page-head" style="margin-bottom: 8px">
        <h3 style="margin: 0">我想加一件小事</h3>
        <el-button
          type="primary"
          class="tap-btn"
          :loading="proposeBusy"
          :disabled="!proposeTitle.trim()"
          @click="submitProposal"
        >
          交给家长
        </el-button>
      </div>
      <p class="muted tiny plan-hint">
        自己提一件想练的小事，家长同意后会出现在今日待办。不是立刻生效，是商量。也可在「今日」里提。
      </p>
      <div v-if="proposeSuggests.length" class="theme-chips" style="margin-bottom: 10px">
        <button
          v-for="s in proposeSuggests"
          :key="s"
          type="button"
          class="theme-chip"
          @click="proposeTitle = s"
        >
          {{ s }}
        </button>
      </div>
      <el-input
        v-model="proposeTitle"
        maxlength="120"
        show-word-limit
        size="large"
        placeholder="例如：每天练跳绳 10 分钟"
        style="margin-bottom: 10px"
      />
      <div class="propose-row">
        <span class="muted tiny">类型</span>
        <el-radio-group v-model="proposeCategory" size="default">
          <el-radio-button value="study">学习</el-radio-button>
          <el-radio-button value="chore">家务</el-radio-button>
          <el-radio-button value="routine">习惯</el-radio-button>
        </el-radio-group>
      </div>
      <div class="propose-row">
        <span class="muted tiny">大约多久（可选）</span>
        <el-input-number v-model="proposeMinutes" :min="5" :max="120" :step="5" size="large" />
        <span class="muted tiny">分钟；不填表示一次完成</span>
      </div>
      <div v-if="myProposals.length" class="my-proposals">
        <div class="muted tiny" style="margin-top: 12px">我提过的</div>
        <div v-for="p in myProposals.slice(0, 5)" :key="p.id" class="proposal-status-row">
          <span>{{ p.title }}</span>
          <el-tag size="small" :type="proposalTagType(p.status)">{{ proposalStatusLabel(p.status) }}</el-tag>
          <p v-if="p.status === 'rejected' && p.rejectNote" class="muted tiny">{{ p.rejectNote }}</p>
        </div>
      </div>
    </div>

    <div class="card-panel plan-main">
      <div class="page-head" style="margin-bottom: 8px">
        <h3 style="margin: 0">学习计划</h3>
        <el-button type="primary" class="tap-btn" @click="planDlg = true">新建</el-button>
      </div>
      <p class="muted tiny plan-hint">
        自己的计划出现在今日「下一件」里；暂不支持「补上进度」与家长确认，适合自愿小目标。
      </p>
      <div v-for="p in plans" :key="p.id" class="plan-block">
        <div class="plan-head">
          <strong>{{ p.title }}</strong>
          <el-button class="tap-btn" size="small" @click="openItem(p)">加今日项</el-button>
        </div>
        <p class="muted" v-if="p.note">{{ p.note }}</p>
        <div v-for="it in p.items || []" :key="it.id" class="item-row">
          <span>{{ it.customTitle || it.task?.title }}</span>
          <el-tag size="small" :type="it.done ? 'success' : 'info'">
            {{ it.done ? '完成' : it.plannedDate || '待做' }}
          </el-tag>
        </div>
      </div>
      <div v-if="!loading && !plans.length">
        <EmptyState title="还没有计划" description="点右上角新建一个小计划，给自己加一件今日项。" />
      </div>
    </div>

    <el-collapse class="me-fold">
      <el-collapse-item name="week">
        <template #title>
          <span>本周小结</span>
        </template>
        <p class="headline muted" v-if="report.headline">{{ report.headline }}</p>
        <div
          v-if="report.weekTheme || report.portfolioStats || report.nearWishStats"
          class="wish-mini"
          style="margin-bottom: 10px"
        >
          <div v-if="report.weekTheme">
            <strong>本周主题 · {{ report.weekTheme.themeTitle || '自定义' }}</strong>
            <p v-if="report.weekTheme.text" class="muted tiny" style="margin: 4px 0 0">
              {{ report.weekTheme.text }}
            </p>
          </div>
          <p v-if="report.portfolioStats" class="muted tiny" style="margin: 6px 0 0">
            作品集：照片 {{ report.portfolioStats.photoCount }} · 想法
            {{ report.portfolioStats.reflectionCount }}
          </p>
          <p v-if="report.nearWishStats?.message" class="muted tiny" style="margin: 6px 0 0">
            近端愿望：{{ report.nearWishStats.message }}
          </p>
          <el-button
            text
            type="primary"
            class="tap-btn"
            style="padding-left: 0"
            @click="$router.push('/student/growth?tab=portfolio')"
          >
            去作品集 ›
          </el-button>
        </div>
        <div v-if="digestBanner" class="digest-banner" role="status">
          {{ digestBanner }}
        </div>
        <div class="stats-row">
          <div>
            <div class="stat-num small">{{ report.completion?.rate ?? report.completionRate }}%</div>
            <div class="muted">完成率</div>
          </div>
          <div>
            <div class="stat-num small">{{ report.checkinDays?.length || 0 }}</div>
            <div class="muted">打卡天数</div>
          </div>
          <div>
            <div class="stat-num small">{{ report.streak }}</div>
            <div class="muted">连续天</div>
          </div>
          <div>
            <div class="stat-num small">{{ pointsLabel }}</div>
            <div class="muted">本周{{ pointsUnit }}</div>
          </div>
        </div>
        <p class="muted heat-hint" v-if="report.daily?.length">点某一天看当天记录</p>
        <div class="heat" v-if="report.daily?.length">
          <button
            v-for="d in report.daily"
            :key="d.date"
            type="button"
            class="heat-cell"
            :class="[heatClass(d), { selected: selectedDate === d.date }]"
            @click="selectDay(d.date)"
          >
            <span>{{ d.isRestDay ? '休' : d.checkinCount || '·' }}</span>
            <span class="heat-day">{{ dowLabel(d.date) }}</span>
          </button>
        </div>
        <div v-if="selectedDay" class="day-panel">
          <div class="day-head">
            <strong>{{ selectedDay.date.slice(5) }} · 周{{ dowLabel(selectedDay.date) }}</strong>
            <el-button text type="primary" @click="clearDay">看整周</el-button>
          </div>
          <div class="muted day-stats">
            <template v-if="selectedDay.isRestDay">休息日</template>
            <template v-else>
              打卡 {{ selectedDay.checkinCount || 0 }} 次 · +{{ selectedDay.pointsEarned || 0 }} 分
            </template>
          </div>
          <div v-for="it in selectedDay.items || []" :key="it.id" class="hi-row">
            {{ it.title }}
            <span v-if="it.parentLiked" class="muted"> · 点赞</span>
          </div>
          <div
            v-if="!selectedDay.isRestDay && !(selectedDay.items || []).length"
          >
            <EmptyState title="这一天还没有打卡" description="完成任务后，会出现在这里。" />
          </div>
        </div>
        <template v-else>
          <div
            v-if="report.reflectionHighlight"
            class="wish-mini reflect-box"
          >
            <div class="muted tiny">本周想通的一件事</div>
            <p v-if="report.reflectionHighlight.prompt" class="muted tiny">
              {{ report.reflectionHighlight.prompt }}
            </p>
            <strong>「{{ report.reflectionHighlight.answer }}」</strong>
          </div>
          <div
            v-if="report.keepsWord?.count > 0 || report.habitStreaks?.length"
            class="hi-list"
          >
            <div v-if="report.keepsWord?.count > 0" class="hi-row">
              {{ report.keepsWord.message }}
            </div>
            <div
              v-for="h in (report.habitStreaks || []).slice(0, 3)"
              :key="h.assignId"
              class="hi-row muted"
            >
              {{ h.note || h.title }}
            </div>
          </div>
          <div v-if="report.nextWish" class="wish-mini">
            <div class="wish-row">
              <strong>
                <template v-if="report.nextWish.isNearTerm">快到手 · </template>
                {{ report.nextWish.title }}
              </strong>
              <span class="muted">
                {{ report.nextWish.lackPoints > 0
                  ? `还差 ${report.nextWish.lackPoints}`
                  : '可以兑换啦' }}
              </span>
            </div>
            <el-progress
              :percentage="wishPercent"
              :stroke-width="10"
              color="var(--accent)"
            />
          </div>
          <div v-if="report.highlights?.length" class="hi-list">
            <div v-for="(h, i) in report.highlights.slice(0, 3)" :key="i" class="hi-row muted">
              {{ h.note || h.title }}
            </div>
          </div>
        </template>
      </el-collapse-item>
    </el-collapse>

    <el-collapse class="me-fold">
      <el-collapse-item name="focus">
        <template #title>
          <span>专注提醒</span>
        </template>
        <p class="muted tiny plan-hint">
          番茄计时结束后，可用提示音、震动；也可读出「时间到啦」。
        </p>
        <div class="pref-row">
          <span>结束时语音提醒</span>
          <el-switch v-model="focusVoiceOn" @change="onFocusVoiceChange" />
        </div>
      </el-collapse-item>
    </el-collapse>

    </template>

    <el-dialog v-model="planDlg" title="新建计划" width="90%" style="max-width: 420px">
      <el-form label-position="top">
        <el-form-item label="标题"><el-input v-model="planForm.title" size="large" /></el-form-item>
        <el-form-item label="备注"><el-input v-model="planForm.note" size="large" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button class="tap-btn full-tap" type="primary" :loading="saving" @click="createPlan">
          保存
        </el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="itemDlg" title="添加今日计划项" width="90%" style="max-width: 420px">
      <el-form label-position="top">
        <el-form-item label="标题">
          <el-input v-model="itemForm.customTitle" size="large" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button class="tap-btn full-tap" type="primary" :loading="saving" @click="addItem">
          添加
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import http from '../../api/http'
import { useAuthStore } from '../../stores/auth'
import { taskSyncTick } from '../../composables/taskSync'
import { labels } from '../../composables/labels'
import EmptyState from '../../components/EmptyState.vue'
import PageSkeleton from '../../components/PageSkeleton.vue'
import {
  getFocusVoiceEnabled,
  setFocusVoiceEnabled,
} from '../../composables/focusPrefs'
import { pointsUnitLabel } from '../../composables/pointsNarrative'
import {
  syncWeeklyGoalStateFromServer,
  persistWeeklyGoalState,
} from '../../composables/weeklyGoal'
import {
  THEME_WEEK_PRESETS,
  suggestionsForThemePreset,
} from '../../composables/themeWeek'
import { createLoadGate, tryBegin } from '../../composables/asyncGuard'

const auth = useAuthStore()
const plans = ref<any[]>([])
const loading = ref(true)
const saving = ref(false)
const meLoadGate = createLoadGate()
const goalSaving = ref(false)
const selectedDate = ref('')
const ageBand = ref(localStorage.getItem('ageBand') || 'general')
const teenMode = computed(() => ageBand.value === 'teen')
const pointsUnit = computed(() => pointsUnitLabel(ageBand.value))
const focusVoiceOn = ref(getFocusVoiceEnabled(ageBand.value))
const weeklyGoalDraft = ref('')
const themePresetDraft = ref('')
const themeTitleDraft = ref('')
const proposeTitle = ref('')
const proposeCategory = ref('study')
const proposeSuggests = computed(() =>
  suggestionsForThemePreset(themePresetDraft.value).slice(0, 3),
)
const proposeMinutes = ref<number | undefined>(15)
const proposeBusy = ref(false)
const myProposals = ref<any[]>([])

function onMePickTheme(code: string) {
  themePresetDraft.value = code
  if (code && code !== 'custom') {
    const hit = THEME_WEEK_PRESETS.find((p) => p.code === code)
    themeTitleDraft.value = hit?.title || ''
  }
  if (!code) themeTitleDraft.value = ''
}

async function saveGoal() {
  const sid = auth.user?.id
  if (!sid) return
  if (!tryBegin(goalSaving)) return
  try {
    const s = await persistWeeklyGoalState(sid, {
      text: weeklyGoalDraft.value,
      themePreset: themePresetDraft.value,
      themeTitle: themeTitleDraft.value,
    })
    weeklyGoalDraft.value = s.text
    themePresetDraft.value = s.themePreset
    themeTitleDraft.value = s.themeTitle
    ElMessage.success(
      s.themeTitle || s.text ? '本周主题已保存' : '已清空本周主题',
    )
  } finally {
    goalSaving.value = false
  }
}

function proposalStatusLabel(s: string) {
  return ({ pending: '等家长看看', approved: '已加入', rejected: '再商量' } as Record<string, string>)[s] || s
}

function proposalTagType(s: string) {
  return ({ pending: 'warning', approved: 'success', rejected: 'info' } as Record<string, string>)[s] || 'info'
}

async function submitProposal() {
  const title = proposeTitle.value.trim()
  if (!title || proposeBusy.value) return
  proposeBusy.value = true
  try {
    await http.post('/tasks/propose', {
      title,
      category: proposeCategory.value,
      suggestedMinutes: proposeMinutes.value || undefined,
    })
    ElMessage.success('已交给家长商量')
    proposeTitle.value = ''
    const rows = await http.get('/my/task-proposals')
    myProposals.value = rows as any[]
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message || '提交失败')
  } finally {
    proposeBusy.value = false
  }
}

function onFocusVoiceChange(v: string | number | boolean) {
  setFocusVoiceEnabled(!!v)
  ElMessage.success(v ? '已开启语音提醒' : '已关闭语音提醒')
}
const report = reactive<any>({
  completionRate: 0,
  streak: 0,
  checkinDays: [],
  daily: [],
  highlights: [],
  points: { net: 0 },
  nextWish: null,
  weekTheme: null,
  portfolioStats: null,
  nearWishStats: null,
  headline: '',
  completion: null,
  digestSettlements: [],
  reflectionHighlight: null,
  keepsWord: null,
  habitStreaks: [],
})
const planDlg = ref(false)
const itemDlg = ref(false)
const currentPlanId = ref(0)
const planForm = reactive({ title: '', note: '' })
const itemForm = reactive({ customTitle: '' })

const digestBanner = computed(() => {
  const rows = (report.digestSettlements || []).filter(
    (s: any) => (s.points || s.settled || 0) > 0,
  )
  if (!rows.length) return ''
  const pts = rows.reduce(
    (n: number, s: any) => n + (s.points || s.settled || 0),
    0,
  )
  return pts > 0
    ? `本周积分已结算：+${pts} 分（日常完成先庆祝，打开小结时一起发）。`
    : ''
})

const selectedDay = computed(() => {
  if (!selectedDate.value) return null
  return (report.daily || []).find((d: any) => d.date === selectedDate.value) || null
})

const pointsLabel = computed(() => {
  const n = report.points?.net ?? 0
  return n > 0 ? `+${n}` : String(n)
})

const wishPercent = computed(() => {
  const w = report.nextWish
  if (!w?.costPoints) return 0
  const have = w.costPoints - (w.lackPoints || 0)
  return Math.min(100, Math.round((have / w.costPoints) * 100))
})

function dowLabel(dateStr: string) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  return ['日', '一', '二', '三', '四', '五', '六'][dt.getDay()]
}

function heatClass(d: any) {
  if (d.isRestDay) return 'rest'
  if (d.checkinCount >= 1) return 'warm'
  return 'empty'
}

function selectDay(date: string) {
  selectedDate.value = selectedDate.value === date ? '' : date
}

function clearDay() {
  selectedDate.value = ''
}

async function load(opts?: { soft?: boolean }) {
  const soft = !!opts?.soft
  const ticket = meLoadGate.next()
  if (!soft) loading.value = true
  try {
    const [p, r, proposals] = await Promise.all([
      http.get('/plans'),
      http.get('/reports/weekly'),
      http.get('/my/task-proposals').catch(() => []),
    ])
    if (!ticket.isCurrent()) return
    plans.value = p as any[]
    myProposals.value = (proposals as any[]) || []
    Object.assign(report, r)
    if (
      selectedDate.value &&
      !(report.daily || []).some((d: any) => d.date === selectedDate.value)
    ) {
      selectedDate.value = ''
    }
    if (!soft) await auth.fetchMe()
    if (!ticket.isCurrent()) return
    const sid = auth.user?.id
    if (sid) {
      const s = await syncWeeklyGoalStateFromServer(sid)
      weeklyGoalDraft.value = s.text
      themePresetDraft.value = s.themePreset
      themeTitleDraft.value = s.themeTitle
    }
    const band = localStorage.getItem('ageBand')
    if (band) ageBand.value = band
  } catch (e: any) {
    if (!ticket.isCurrent()) return
    if (!soft) ElMessage.error(e.message || '加载失败')
  } finally {
    if (ticket.isCurrent() && !soft) loading.value = false
  }
}

async function createPlan() {
  if (!planForm.title.trim()) return ElMessage.warning('请填写标题')
  if (!tryBegin(saving)) return
  try {
    await http.post('/plans', { ...planForm })
    planDlg.value = false
    planForm.title = ''
    planForm.note = ''
    ElMessage.success('已创建')
    await load()
  } catch (e: any) {
    ElMessage.error(e.message)
  } finally {
    saving.value = false
  }
}

function openItem(p: any) {
  currentPlanId.value = p.id
  itemForm.customTitle = ''
  itemDlg.value = true
}

async function addItem() {
  if (!itemForm.customTitle.trim()) return ElMessage.warning('请填写标题')
  if (!tryBegin(saving)) return
  try {
    await http.post(`/plans/${currentPlanId.value}/items`, {
      customTitle: itemForm.customTitle,
    })
    itemDlg.value = false
    ElMessage.success('已添加，可在今日打卡')
    await load()
  } catch (e: any) {
    ElMessage.error(e.message)
  } finally {
    saving.value = false
  }
}

onMounted(() => load())
watch(taskSyncTick, () => {
  void load({ soft: true })
})
</script>

<style scoped>
.soft-balance.profile {
  text-align: left;
  padding: 12px 16px;
}
.soft-balance .balance-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
}
.soft-balance .balance-num {
  font-size: 1.35rem;
  font-weight: 700;
  color: var(--accent);
  font-family: var(--font-display);
}
.growth-link {
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  min-height: var(--tap-min, 48px);
}
.growth-link .arrow {
  font-size: 1.6rem;
  color: var(--muted);
}
.theme-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.theme-chip {
  border: 1px solid var(--line, #d8e0d6);
  background: #fff;
  border-radius: 999px;
  padding: 8px 12px;
  min-height: var(--tap-min, 44px);
  cursor: pointer;
  font: inherit;
}
.theme-chip.on {
  border-color: var(--accent-strong, #2d6b52);
  background: #eef6f1;
}
.plan-main {
  border-color: color-mix(in srgb, var(--accent, #3d8b6e) 18%, var(--line));
}
.plan-hint {
  margin: 0 0 10px;
  line-height: 1.45;
}
.propose-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}
.proposal-status-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  padding: 8px 0;
  border-top: 1px dashed var(--line);
}
.proposal-status-row:first-of-type {
  border-top: none;
}
.pref-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: var(--tap-min);
}
.me-fold {
  margin-bottom: 12px;
  border: none;
}
.me-fold :deep(.el-collapse-item__header) {
  font-weight: 600;
  font-size: 1rem;
}
.plan-block {
  padding: 12px 0;
  border-top: 1px dashed var(--line);
}
.plan-block:first-of-type {
  border-top: none;
}
.plan-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}
.item-row {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 0;
  font-size: 0.95rem;
  min-height: var(--tap-min);
  align-items: center;
}
.stats-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  text-align: center;
  gap: 12px;
}
.stat-num.small {
  font-size: clamp(1.5rem, 3vw, 2.2rem);
}
.headline {
  margin: 0 0 12px;
  line-height: 1.45;
  font-size: 0.95rem;
}
.digest-banner {
  margin: 0 0 12px;
  padding: 10px 12px;
  border-radius: 12px;
  background: var(--warm);
  border: 1px solid var(--warm-line);
  font-size: 0.92rem;
  color: var(--accent-strong);
}
.heat-hint {
  margin: 10px 0 0;
  font-size: 0.85rem;
}
.heat {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
  margin-top: 8px;
}
.heat-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 6px 2px;
  border-radius: 8px;
  font-size: 0.85rem;
  font-weight: 700;
  border: 1px solid var(--line);
  background: #fff;
  font-family: inherit;
  color: inherit;
  cursor: pointer;
}
.heat-cell.selected {
  outline: 2px solid var(--accent);
  outline-offset: 1px;
}
.day-panel {
  margin-top: 12px;
  padding-top: 10px;
  border-top: 1px dashed var(--line);
}
.day-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}
.day-stats {
  margin: 6px 0 8px;
  font-size: 0.9rem;
}
.heat-cell.rest {
  background: #f3f4f6;
  color: var(--muted);
}
.heat-cell.empty {
  background: #fafcfb;
  color: var(--muted);
}
.heat-cell.warm {
  background: var(--accent-soft);
  color: var(--accent-strong);
}
.heat-day {
  font-size: 0.7rem;
  font-weight: 500;
  color: var(--muted);
}
.wish-mini {
  margin-top: 14px;
}
.reflect-box strong {
  display: block;
  margin-top: 4px;
  line-height: 1.45;
}
.wish-row {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
}
.hi-list {
  margin-top: 12px;
}
.hi-row {
  padding: 6px 0;
  font-size: 0.9rem;
  border-top: 1px dashed var(--line);
}
@media (min-width: 480px) {
  .stats-row {
    grid-template-columns: repeat(4, 1fr);
  }
}
</style>
