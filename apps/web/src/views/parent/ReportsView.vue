<template>
  <div class="page" :class="{ 'tv-mode': isTv }">
    <PageSkeleton v-if="loading" :rows="5" />
    <template v-else>
    <div class="page-head">
      <div>
        <h2 class="page-title" style="margin: 0">{{ labels.parentReports }}</h2>
        <p v-if="report.range" class="muted range">
          {{ report.range.from }} ~ {{ report.range.to }}
        </p>
      </div>
      <el-select
        v-if="students.length > 1"
        v-model="studentId"
        size="large"
        style="min-width: 140px"
        @change="load"
      >
        <el-option label="全部孩子" :value="0" />
        <el-option
          v-for="s in students"
          :key="s.id"
          :label="s.name"
          :value="s.id"
        />
      </el-select>
    </div>

    <div class="card-panel headline-card">
      <p class="headline">{{ loading ? '加载中…' : report.headline || '本周暂无数据' }}</p>
    </div>

    <div
      v-if="report.weekTheme || report.portfolioStats || report.nearWishStats"
      class="card-panel theme-portfolio"
    >
      <div v-if="report.weekTheme">
        <strong>本周主题 · {{ report.weekTheme.themeTitle || '自定义' }}</strong>
        <p v-if="report.weekTheme.text" class="muted tiny" style="margin: 6px 0 0">
          {{ report.weekTheme.text }}
        </p>
      </div>
      <p v-if="report.portfolioStats" class="muted tiny" style="margin: 8px 0 0">
        作品集：照片 {{ report.portfolioStats.photoCount }} · 想法
        {{ report.portfolioStats.reflectionCount }} · 里程碑
        {{ report.portfolioStats.milestoneCount }}
      </p>
      <p v-if="report.nearWishStats?.message" class="muted tiny" style="margin: 8px 0 0">
        近端愿望：{{ report.nearWishStats.message }}
      </p>
      <el-button
        text
        type="primary"
        class="tap-btn"
        style="margin-top: 4px; padding-left: 0"
        @click="
          $router.push(
            studentId
              ? `/parent/growth?tab=portfolio&studentId=${studentId}`
              : '/parent/growth?tab=portfolio',
          )
        "
      >
        打开成长作品集 ›
      </el-button>
    </div>

    <div
      v-if="digestBanner"
      class="card-panel digest-banner"
      role="status"
    >
      <strong>本周积分已结算</strong>
      <p class="muted" style="margin: 6px 0 0">{{ digestBanner }}</p>
    </div>

    <div class="card-panel" v-if="report.emotionWordCloud?.length">
      <h3>本周心情词</h3>
      <p class="muted tiny">{{ NOT_SCORE_DISCLAIMER }} 来自打卡反思，只做家庭看见。</p>
      <div class="emotion-cloud">
        <span
          v-for="tag in report.emotionWordCloud"
          :key="tag.word"
          class="emotion-tag"
          :style="{ fontSize: `${0.85 + Math.min(tag.count, 4) * 0.08}rem` }"
        >
          {{ tag.word }}
          <small v-if="tag.count > 1" class="muted">×{{ tag.count }}</small>
        </span>
      </div>
    </div>

    <div class="card-panel" v-if="report.daily?.length">
      <h3>近 7 日节奏</h3>
      <p class="muted heat-hint">点某一天，查看当天打卡与积分</p>
      <div class="heat">
        <button
          v-for="d in report.daily"
          :key="d.date"
          type="button"
          class="heat-cell"
          :class="[heatClass(d), { selected: selectedDate === d.date }]"
          :title="heatTip(d)"
          @click="selectDay(d.date)"
        >
          <span class="heat-dow">{{ dowLabel(d.date) }}</span>
          <span class="heat-dot">{{ d.isRestDay ? '休' : d.checkinCount || '' }}</span>
          <span class="heat-day">{{ d.date.slice(5) }}</span>
        </button>
      </div>

      <div v-if="selectedDay" class="day-panel">
        <div class="day-head">
          <strong>{{ selectedDay.date }} · 周{{ dowLabel(selectedDay.date) }}</strong>
          <el-button text type="primary" @click="clearDay">看整周</el-button>
        </div>
        <div class="day-stats muted">
          <template v-if="selectedDay.isRestDay">休息日</template>
          <template v-else>
            打卡 {{ selectedDay.checkinCount || 0 }} 次
            · +{{ selectedDay.pointsEarned || 0 }} 分
            <template v-if="selectedDay.pointsSpent">
              · 花 {{ selectedDay.pointsSpent }} 分
            </template>
          </template>
        </div>
        <div
          v-for="it in selectedDay.items || []"
          :key="it.id"
          class="day-item"
        >
          <div>
            <strong>{{ it.title }}</strong>
            <span v-if="!studentId && it.studentName" class="muted">
              · {{ it.studentName }}
            </span>
            <div class="muted tiny" v-if="it.parentLiked || it.parentComment || it.note || it.reflectionText">
              <template v-if="it.parentLiked">点赞 </template>
              <template v-if="it.parentComment">「{{ it.parentComment }}」</template>
              <template v-else-if="it.reflectionText">想通：{{ it.reflectionText }}</template>
              <template v-else-if="it.note">{{ it.note }}</template>
            </div>
          </div>
        </div>
        <div
          v-if="!selectedDay.isRestDay && !(selectedDay.items || []).length"
        >
          <EmptyState title="这一天还没有打卡" description="完成任务后，会出现在这里。" />
        </div>
      </div>
    </div>

    <div class="card-panel stats">
      <div>
        <div class="stat-num">{{ report.completion?.rate ?? report.completionRate }}%</div>
        <div class="muted">本周完成率</div>
        <div class="muted tiny" v-if="report.completion">
          {{ report.completion.done }}/{{ report.completion.due || 0 }}
        </div>
      </div>
      <div>
        <div class="stat-num">{{ report.checkinDays?.length || 0 }}</div>
        <div class="muted">有打卡天数</div>
      </div>
      <div>
        <div class="stat-num">{{ report.streak }}</div>
        <div class="muted">连续打卡</div>
      </div>
      <div>
        <div class="stat-num">{{ pointsNetLabel }}</div>
        <div class="muted">积分脚注</div>
      </div>
    </div>

    <div class="split" v-if="!isTv">
      <div class="card-panel">
        <h3>本周高光</h3>
        <div v-for="(h, i) in report.highlights || []" :key="i" class="lag-row">
          <span>
            {{ h.title }}
            <span v-if="!studentId && h.studentName" class="muted"> · {{ h.studentName }}</span>
            <div class="muted tiny">{{ h.note }}</div>
          </span>
        </div>
        <EmptyState
          v-if="!loading && !report.highlights?.length"
          title="还没有高光"
          description="多打卡几天，这里会出现亮点。"
        />
      </div>

      <div class="card-panel">
        <h3>还想一起完成的</h3>
        <div
          v-for="t in report.laggingTasks || []"
          :key="t.assignId || t.taskId + '-' + t.studentId"
          class="lag-row"
        >
          <span>
            {{ t.title }}
            <span v-if="!studentId && t.studentName" class="muted"> · {{ t.studentName }}</span>
          </span>
          <strong>{{ Math.round(t.progressPercent) }}%</strong>
        </div>
        <EmptyState
          v-if="!loading && !report.laggingTasks?.length"
          title="节奏不错"
          description="本周没有特别想补的任务。"
        />
        <p v-if="report.pendingConfirms > 0" class="pending-hint muted">
          还有 {{ report.pendingConfirms }} 条待确认
        </p>
      </div>
    </div>

    <template v-else>
      <div class="card-panel">
        <h3>还想一起完成的</h3>
        <div
          v-for="t in report.laggingTasks || []"
          :key="t.assignId || t.taskId + '-' + t.studentId"
          class="lag-row"
        >
          <span>{{ t.title }}</span>
          <strong>{{ Math.round(t.progressPercent) }}%</strong>
        </div>
      </div>
    </template>

    <el-collapse v-if="hasWeekDetails" class="details-fold">
      <el-collapse-item name="details">
        <template #title>
          <span>本周细节</span>
        </template>

        <div class="detail-block" v-if="report.eqMoments">
          <h3>情商 · 本周</h3>
          <p class="muted">{{ report.eqMoments.message }}</p>
          <div v-for="it in report.eqMoments.items || []" :key="it.id" class="eq-row">
            <div>
              <strong>{{ it.title }}</strong>
              <span v-if="!studentId && it.studentName" class="muted"> · {{ it.studentName }}</span>
              <div v-if="it.reflectionText || it.note" class="muted tiny">
                {{ it.reflectionText || it.note }}
              </div>
            </div>
          </div>
        </div>

        <div class="detail-block" v-if="report.reflectionHighlight">
          <h3>本周想通的一件事</h3>
          <p v-if="report.reflectionHighlight.prompt" class="muted tiny">
            {{ report.reflectionHighlight.prompt }}
            <template v-if="!studentId && report.reflectionHighlight.studentName">
              · {{ report.reflectionHighlight.studentName }}
            </template>
          </p>
          <p class="reflect-answer">「{{ report.reflectionHighlight.answer }}」</p>
          <p class="muted tiny">
            {{ report.reflectionHighlight.date }}
            · {{ report.reflectionHighlight.taskTitle }}
          </p>
        </div>

        <div class="detail-block" v-if="report.coachInsights?.length">
          <h3>本周教练视角</h3>
          <p class="muted tiny">基于打卡模式，不评分、不排名。</p>
          <div v-for="(ins, i) in report.coachInsights" :key="i" class="coach-row">
            <p style="margin: 8px 0 4px">{{ ins.message }}</p>
            <p class="muted tiny">{{ ins.suggestion }}</p>
          </div>
        </div>

        <div class="detail-block" v-if="report.parentEncouragement">
          <h3>家长的一句暖话</h3>
          <p class="reflect-answer">「{{ report.parentEncouragement.comment }}」</p>
          <p class="muted tiny">
            {{ report.parentEncouragement.date }}
            · {{ report.parentEncouragement.taskTitle }}
            <template v-if="!studentId && report.parentEncouragement.studentName">
              · {{ report.parentEncouragement.studentName }}
            </template>
          </p>
        </div>

        <div
          class="detail-block"
          v-if="report.keepsWord?.count > 0 || report.habitStreaks?.length"
        >
          <h3>说到做到 · 好习惯</h3>
          <p v-if="report.keepsWord?.count > 0" class="keep-line">
            {{ report.keepsWord.message }}
            <span class="muted tiny">（按时还回积分约定）</span>
          </p>
          <div
            v-for="h in report.habitStreaks || []"
            :key="h.assignId"
            class="lag-row"
          >
            <span>
              {{ h.title }}
              <span v-if="!studentId && h.studentName" class="muted"> · {{ h.studentName }}</span>
              <div class="muted tiny">{{ h.note }}</div>
            </span>
          </div>
        </div>

        <div class="detail-block" v-if="report.nextWish">
          <h3>目标愿望</h3>
          <div class="wish-row">
            <strong>{{ report.nextWish.title }}</strong>
            <span class="muted">
              {{ report.nextWish.lackPoints > 0
                ? `还差 ${report.nextWish.lackPoints} 分`
                : '积分够啦' }}
            </span>
          </div>
          <el-progress
            :percentage="wishPercent"
            :stroke-width="12"
            color="var(--accent)"
          />
        </div>
      </el-collapse-item>
    </el-collapse>

    <div class="card-panel" v-if="report.byCategory?.some((c: any) => c.count)">
      <h3>打卡分布</h3>
      <div class="cat-row" v-for="c in report.byCategory" :key="c.category">
        <span>{{ c.label }}</span>
        <el-progress
          :percentage="catPercent(c.count)"
          :stroke-width="10"
          :show-text="true"
          :format="() => String(c.count)"
          color="var(--accent)"
        />
      </div>
    </div>

    <div class="card-panel" v-if="report.perStudent?.length">
      <div class="page-head" style="margin-bottom: 8px">
        <h3 style="margin: 0">各自节奏</h3>
        <el-button text type="primary" @click="showCompare = !showCompare">
          {{ showCompare ? '收起' : '展开看看' }}
        </el-button>
      </div>
      <p class="muted tiny" style="margin-top: 0">
        默认折叠，避免孩子之间比来比去；需要时再展开。
      </p>
      <template v-if="showCompare">
        <div v-for="p in report.perStudent" :key="p.studentId" class="per-row">
          <div class="per-head">
            <strong>{{ p.name }}</strong>
            <span class="muted">连续 {{ p.streak }} 天</span>
          </div>
          <div class="per-stats muted">
            完成 {{ p.completionRate }}% · 打卡 {{ p.checkinDays }} 天 · +{{ p.pointsEarned }} 分
            <template v-if="p.pendingConfirms"> · 待确认 {{ p.pendingConfirms }}</template>
          </div>
        </div>
      </template>
    </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import http from '../../api/http'
import PageSkeleton from '../../components/PageSkeleton.vue'
import { useBreakpoint } from '../../composables/useBreakpoint'
import { friendlyError } from '../../composables/useOnboarding'
import { labels } from '../../composables/labels'
import EmptyState from '../../components/EmptyState.vue'
import { NOT_SCORE_DISCLAIMER } from '../../composables/eduRelationCopy'

const { isTv } = useBreakpoint()
const students = ref<any[]>([])
const studentId = ref(0)
const selectedDate = ref('')
const loading = ref(true)
const showCompare = ref(false)
const report = reactive<any>({
  completionRate: 0,
  completion: { due: 0, done: 0, rate: 0 },
  streak: 0,
  laggingTasks: [],
  checkinDays: [],
  daily: [],
  highlights: [],
  byCategory: [],
  points: { earned: 0, spent: 0, net: 0, balance: 0 },
  nextWish: null,
  weekTheme: null,
  portfolioStats: null,
  nearWishStats: null,
  pendingConfirms: 0,
  perStudent: [],
  headline: '',
  range: null,
  digestSettlements: [],
  reflectionHighlight: null,
  keepsWord: null,
  habitStreaks: [],
})

const digestBanner = computed(() => {
  const rows = (report.digestSettlements || []).filter(
    (s: any) => (s.points || 0) > 0 || (s.settled || 0) > 0,
  )
  if (!rows.length) return ''
  if (studentId.value) {
    const hit = rows.find((s: any) => s.studentId === studentId.value) || rows[0]
    const pts = hit.points || hit.settled || 0
    return pts > 0
      ? `周汇总结算：本次发放 +${pts} 分（日常完成先庆祝，打开周报时一起发）。`
      : ''
  }
  const total = rows.reduce(
    (n: number, s: any) => n + (s.points || s.settled || 0),
    0,
  )
  if (total <= 0) return ''
  const parts = rows
    .map((s: any) => {
      const name =
        students.value.find((x) => x.id === s.studentId)?.name ||
        `孩子${s.studentId}`
      return `${name} +${s.points || s.settled || 0}`
    })
    .join(' · ')
  return `周汇总结算共 +${total} 分（${parts}）。日常完成先庆祝，打开本周报告时一次性发放。`
})

const selectedDay = computed(() => {
  if (!selectedDate.value) return null
  return (report.daily || []).find((d: any) => d.date === selectedDate.value) || null
})

const pointsNetLabel = computed(() => {
  const n = report.points?.net ?? 0
  return n > 0 ? `+${n}` : String(n)
})

const wishPercent = computed(() => {
  const w = report.nextWish
  if (!w?.costPoints) return 0
  const have = w.costPoints - (w.lackPoints || 0)
  return Math.min(100, Math.round((have / w.costPoints) * 100))
})

const hasWeekDetails = computed(
  () =>
    !!report.eqMoments ||
    !!report.reflectionHighlight ||
    !!(report.coachInsights?.length) ||
    !!report.parentEncouragement ||
    (report.keepsWord?.count || 0) > 0 ||
    !!(report.habitStreaks?.length) ||
    !!report.nextWish,
)

const catTotal = computed(() =>
  (report.byCategory || []).reduce((s: number, c: any) => s + (c.count || 0), 0),
)

function catPercent(count: number) {
  if (!catTotal.value) return 0
  return Math.round((count / catTotal.value) * 100)
}

function dowLabel(dateStr: string) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  return ['日', '一', '二', '三', '四', '五', '六'][dt.getDay()]
}

function heatClass(d: any) {
  if (d.isRestDay) return 'rest'
  if (d.checkinCount >= 3) return 'hot'
  if (d.checkinCount >= 1) return 'warm'
  return 'empty'
}

function heatTip(d: any) {
  if (d.isRestDay) return `${d.date} 休息日 · 点击查看`
  return `${d.date} 打卡 ${d.checkinCount} 次 · 点击查看`
}

function selectDay(date: string) {
  selectedDate.value = selectedDate.value === date ? '' : date
}

function clearDay() {
  selectedDate.value = ''
}

async function load() {
  loading.value = true
  try {
    const q = studentId.value ? `?studentId=${studentId.value}` : ''
    Object.assign(report, await http.get(`/reports/weekly${q}`))
    if (
      selectedDate.value &&
      !(report.daily || []).some((d: any) => d.date === selectedDate.value)
    ) {
      selectedDate.value = ''
    }
  } catch (e: any) {
    ElMessage.error(friendlyError(e, '周报暂时打不开'))
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  try {
    students.value = (await http.get('/students')) as any[]
  } catch {
    students.value = []
  }
  await load()
})
</script>

<style scoped>
.range {
  margin: 4px 0 0;
  font-size: 0.9rem;
}
.headline-card {
  padding: 18px 20px;
}
.headline {
  margin: 0;
  font-size: 1.15rem;
  line-height: 1.5;
  font-family: var(--font-display);
  color: var(--accent-strong);
}
.digest-banner {
  background: var(--warm);
  border-color: var(--warm-line);
}
.details-fold {
  margin-bottom: 16px;
  border: none;
}
.details-fold :deep(.el-collapse-item__header) {
  font-weight: 600;
  font-size: 1rem;
}
.detail-block {
  padding: 12px 0;
  border-bottom: 1px dashed var(--line);
}
.detail-block:last-child {
  border-bottom: none;
}
.stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 18px;
  text-align: center;
}
.tiny {
  font-size: 0.8rem;
  margin-top: 2px;
}
.reflect-answer {
  margin: 6px 0;
  font-size: 1.05rem;
  line-height: 1.5;
}
.emotion-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 14px;
  margin-top: 8px;
}
.emotion-tag {
  padding: 6px 12px;
  border-radius: 999px;
  background: rgba(255, 183, 77, 0.15);
  font-weight: 600;
}
.keep-line {
  margin: 0 0 10px;
  font-weight: 600;
}
h3 {
  margin-top: 0;
  font-family: var(--font-display);
}
.heat-hint {
  margin: -4px 0 10px;
  font-size: 0.88rem;
}
.heat {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 6px;
}
.heat-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 8px 4px;
  border-radius: 10px;
  border: 1px solid var(--line);
  min-height: 72px;
  background: #fff;
  font: inherit;
  color: inherit;
  cursor: pointer;
  transition: border-color 0.15s ease, transform 0.12s ease;
}
.heat-cell:hover {
  border-color: var(--accent);
}
.heat-cell.selected {
  outline: 2px solid var(--accent);
  outline-offset: 1px;
  transform: translateY(-1px);
}
.heat-cell.rest {
  background: #f3f4f6;
  color: var(--muted);
}
.heat-cell.empty {
  background: #fafcfb;
}
.heat-cell.warm {
  background: var(--accent-soft);
  border-color: rgba(47, 111, 78, 0.2);
}
.heat-cell.hot {
  background: rgba(47, 111, 78, 0.22);
  border-color: var(--accent);
}
.day-panel {
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px dashed var(--line);
}
.day-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 6px;
}
.day-stats {
  margin-bottom: 8px;
  font-size: 0.92rem;
}
.day-item {
  padding: 10px 0;
  border-bottom: 1px dashed var(--line);
}
.heat-dow {
  font-size: 0.75rem;
  color: var(--muted);
}
.heat-dot {
  font-weight: 800;
  font-size: 1rem;
  min-height: 1.2em;
}
.heat-day {
  font-size: 0.72rem;
  color: var(--muted);
}
.wish-row {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 10px;
}
.eq-row {
  padding: 10px 0;
  border-bottom: 1px dashed var(--line);
}
.eq-row:last-child {
  border-bottom: none;
}
.split {
  display: grid;
  gap: 12px;
}
.lag-row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px dashed var(--line);
  font-size: 1.05rem;
  min-height: var(--tap-min);
  align-items: center;
}
.pending-hint {
  margin: 12px 0 0;
  font-size: 0.9rem;
}
.cat-row {
  margin-bottom: 10px;
}
.per-row {
  padding: 12px 0;
  border-bottom: 1px dashed var(--line);
}
.per-head {
  display: flex;
  justify-content: space-between;
  margin-bottom: 4px;
}
.per-stats {
  font-size: 0.9rem;
}
@media (min-width: 768px) {
  .stats {
    grid-template-columns: repeat(4, 1fr);
  }
  .split {
    grid-template-columns: 1fr 1fr;
  }
}
@media (min-width: 1600px) {
  .stat-num {
    font-size: 2.6rem;
  }
  .headline {
    font-size: 1.5rem;
  }
}
</style>
