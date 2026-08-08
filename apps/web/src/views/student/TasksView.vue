<template>
  <div class="page">
    <div class="page-head">
      <h2 class="page-title" style="margin: 0">{{ labels.studentTasks }}</h2>
    </div>

    <PageSkeleton v-if="loading" :rows="4" :hero="false" />
    <template v-else>
      <div class="slot-bar">
        <el-radio-group v-model="slotFilter" size="large" class="slot-tabs">
          <el-radio-button value="all">
            全部
            <span v-if="slotCounts.all" class="tab-n">{{ slotCounts.all }}</span>
          </el-radio-button>
          <el-radio-button v-for="s in visibleSlots" :key="s" :value="s">
            {{ labelSlot(s) }}
            <span v-if="slotCounts[s]" class="tab-n">{{ slotCounts[s] }}</span>
          </el-radio-button>
        </el-radio-group>
      </div>

      <p class="muted list-hint">
        任务档案：查历史、补进度。日常请回「今日」。
      </p>

      <el-collapse class="more-filters">
        <el-collapse-item title="搜索与状态筛选" name="more">
          <el-input
            v-model="keyword"
            clearable
            size="large"
            placeholder="搜索任务名称"
            class="search"
            @input="onSearch"
          />
          <el-radio-group v-model="filter" size="large" class="filter-group">
            <el-radio-button value="all">状态·全部</el-radio-button>
            <el-radio-button value="active">进行中</el-radio-button>
            <el-radio-button value="done">已完成</el-radio-button>
          </el-radio-group>
        </el-collapse-item>
      </el-collapse>

      <div class="task-grid">
        <div v-for="t in filtered" :key="t.assignId" class="card-panel task-card">
          <div class="task-main">
            <h3>{{ t.title }}</h3>
            <p class="muted meta-line">{{ cardMeta(t) }}</p>
            <el-progress
              :percentage="Math.round(t.progressPercent)"
              :stroke-width="isTv ? 14 : 10"
              style="margin: 10px 0"
            />
            <div class="tags">
              <el-tag v-if="slotFilter === 'all'" size="small" type="info">
                {{ labelSlot(t.timeSlot) }}
              </el-tag>
              <el-tag size="small">{{ labelCategory(t.category) }}</el-tag>
              <el-tag size="small" type="warning">{{ t.pointsReward }} 积分</el-tag>
              <el-tag
                size="small"
                :type="
                  t.sharedDone || t.status === 'shared_done'
                    ? 'success'
                    : t.progressPercent >= 100
                      ? 'success'
                      : 'info'
                "
              >
                {{
                  t.sharedDone || t.status === 'shared_done'
                    ? '家人已完成'
                    : t.progressPercent >= 100
                      ? '已完成'
                      : '进行中'
                }}
              </el-tag>
              <el-tag
                v-if="habitRhythmLabel(t)"
                size="small"
                type="success"
              >
                {{ habitRhythmLabel(t) }}
              </el-tag>
            </div>
          </div>
          <el-button
            v-if="t.canMakeup && makeupEnabled"
            type="warning"
            plain
            class="tap-btn"
            :class="{ 'full-tap': isPhone }"
            @click="goMakeup(t)"
          >
            补上进度
          </el-button>
          <el-button
            v-else-if="
              !t.sharedDone &&
              t.status !== 'shared_done' &&
              !t.isExpired &&
              (t.progressPercent < 100 || t.schedule !== 'once')
            "
            type="primary"
            plain
            class="tap-btn"
            :class="{ 'full-tap': isPhone }"
            @click="goCheckin(t)"
          >
            {{
              isRestDay && t.schedule !== 'once' && !isLifeHabitCategory(t.category)
                ? '休息日·拿到今日'
                : '拿到今日处理'
            }}
          </el-button>
          <el-tag v-if="t.isExpired" size="small" type="info" effect="plain">
            {{ makeupEnabled ? '已过期' : '已过期（家庭暂未开启补上进度）' }}
          </el-tag>
        </div>
      </div>

      <div v-if="!filtered.length" class="card-panel">
        <EmptyState
          :title="emptyTitle"
          :description="emptyDesc"
          :action-label="
            slotFilter !== 'all' && statusFiltered.length ? '查看全部时段' : ''
          "
          @action="slotFilter = 'all'"
        />
      </div>
    </template>

    <SoftPrompt
      v-model="restSoft.open"
      kid-mode
      :title="REST_DAY_SOFT.title"
      :message="restSoft.message"
      :confirm-text="REST_DAY_SOFT.confirmText"
      :cancel-text="REST_DAY_SOFT.cancelText"
      :show-input="false"
      @confirm="onRestSoftConfirm"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import http from '../../api/http'
import { useBreakpoint } from '../../composables/useBreakpoint'
import { taskSyncTick } from '../../composables/taskSync'
import {
  labelSlot,
  resolveCurrentSlot,
  slotOrderForUi,
  type TimeSlot,
} from '../../composables/timeSlotPolicy'
import EmptyState from '../../components/EmptyState.vue'
import PageSkeleton from '../../components/PageSkeleton.vue'
import SoftPrompt from '../../components/SoftPrompt.vue'
import { isLifeHabitCategory } from '../../composables/restDayPolicy'
import {
  buildRestDayBringSoftMessage,
  REST_DAY_SOFT,
} from '../../composables/restDayDeleteSoftCopy'
import { labels } from '../../composables/labels'
import { createLoadGate } from '../../composables/asyncGuard'
import { labelCategory, labelSchedule } from '../../composables/taskLabels'
import { habitRhythmLabel } from '../../composables/todayFocusOrder'

const router = useRouter()
const { isPhone, isTv } = useBreakpoint()
const list = ref<any[]>([])
const restSoft = reactive({
  open: false,
  task: null as any,
  message: buildRestDayBringSoftMessage(),
})
const loading = ref(true)
const tasksLoadGate = createLoadGate()
const isRestDay = ref(false)
const makeupEnabled = ref(true)
const keyword = ref('')
const filter = ref<'all' | 'active' | 'done'>('all')
const slotExtendedEnabled = ref(localStorage.getItem('slotExtendedEnabled') === '1')
const slotClockEffective = ref<Record<
  string,
  { startHour: number; endHour: number }
> | null>(null)
try {
  const raw = localStorage.getItem('slotClockEffective')
  if (raw) slotClockEffective.value = JSON.parse(raw)
} catch {
  /* ignore */
}
const visibleSlots = computed(() => slotOrderForUi(slotExtendedEnabled.value))
const slotFilter = ref<'all' | TimeSlot>(
  resolveCurrentSlot(new Date(), {
    extendedEnabled: slotExtendedEnabled.value,
    clockMap: slotClockEffective.value,
  }),
)

function goCheckin(t: any) {
  if (
    isRestDay.value &&
    t.schedule !== 'once' &&
    !isLifeHabitCategory(t.category) &&
    t.progressPercent < 100
  ) {
    restSoft.task = t
    restSoft.open = true
    return
  }
  bringToToday(t)
}

function onRestSoftConfirm() {
  const t = restSoft.task
  restSoft.open = false
  restSoft.task = null
  if (t) bringToToday(t)
}

function bringToToday(t: any) {
  router.push({ path: '/student/today', query: { assignId: String(t.assignId) } })
  ElMessage.success('已带到今日，请在「下一件」里完成')
}

function goMakeup(t: any) {
  router.push({
    path: '/student/today',
    query: {
      assignId: String(t.assignId),
      makeup: '1',
    },
  })
}

function onSearch() {
  if (keyword.value.trim()) slotFilter.value = 'all'
}

const statusFiltered = computed(() => {
  const q = keyword.value.trim().toLowerCase()
  return list.value.filter((t) => {
    const done = t.progressPercent >= 100
    if (filter.value === 'active' && done) return false
    if (filter.value === 'done' && !done) return false
    if (q && !String(t.title || '').toLowerCase().includes(q)) return false
    return true
  })
})

const slotCounts = computed(() => {
  const base = statusFiltered.value
  const counts: Record<string, number> = { all: base.length }
  for (const s of visibleSlots.value) {
    counts[s] = base.filter((t) => (t.timeSlot || 'anytime') === s).length
  }
  // 仍统计当前筛选中出现但不在可见序的扩展时段（关掉扩展后）
  for (const t of base) {
    const s = t.timeSlot || 'anytime'
    if (counts[s] == null) {
      counts[s] = base.filter((x) => (x.timeSlot || 'anytime') === s).length
    }
  }
  return counts
})

const filtered = computed(() => {
  if (slotFilter.value === 'all') return statusFiltered.value
  return statusFiltered.value.filter(
    (t) => (t.timeSlot || 'anytime') === slotFilter.value,
  )
})

const emptyTitle = computed(() => {
  if (!list.value.length) return '暂无指派任务'
  if (slotFilter.value !== 'all' && statusFiltered.value.length) {
    return `${labelSlot(slotFilter.value)}暂时没有任务`
  }
  return '没有符合筛选的任务'
})

const emptyDesc = computed(() => {
  if (!list.value.length) {
    return '请让家长发布并指派任务后，这里就会出现。'
  }
  return '换个时段或筛选看看，或去今日做下一件。'
})

function cardMeta(t: any) {
  const parts = [labelSchedule(t.schedule, 'list'), `目标 ${t.targetValue}`]
  if (t.description) parts.push(String(t.description).slice(0, 40))
  return parts.join(' · ')
}

async function load(opts?: { soft?: boolean }) {
  const soft = !!opts?.soft
  const ticket = tasksLoadGate.next()
  if (!soft) loading.value = true
  try {
    // soft：只刷任务列表；休息日/时段以硬加载为准，避免双接口扇出
    const tasks = await http.get('/my/tasks')
    if (!ticket.isCurrent()) return
    list.value = tasks as any[]
    if (!soft) {
      const t: any = await http.get('/my/today')
      if (!ticket.isCurrent()) return
      isRestDay.value = !!t?.isRestDay
      makeupEnabled.value = t?.makeupEnabled !== false
      slotExtendedEnabled.value = !!t?.slotExtendedEnabled
      localStorage.setItem(
        'slotExtendedEnabled',
        slotExtendedEnabled.value ? '1' : '0',
      )
      if (t?.slotClockEffective) {
        slotClockEffective.value = t.slotClockEffective
        localStorage.setItem(
          'slotClockEffective',
          JSON.stringify(t.slotClockEffective),
        )
      }
    }
  } catch (e: any) {
    if (!ticket.isCurrent()) return
    if (!soft) ElMessage.error(e.message || '加载失败')
  } finally {
    if (ticket.isCurrent() && !soft) loading.value = false
  }
}

onMounted(() => load())
watch(taskSyncTick, () => {
  void load({ soft: true })
})
</script>

<style scoped>
.filters {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.slot-bar {
  margin-bottom: 8px;
}
.slot-tabs,
.filter-group {
  display: flex;
  flex-wrap: wrap;
}
.more-filters {
  margin-top: 16px;
}
.more-filters .search {
  margin-bottom: 12px;
}
.tab-n {
  margin-left: 4px;
  font-size: 0.8em;
  opacity: 0.75;
}
.search {
  width: 100%;
}
.list-hint {
  margin: 0 4px 12px;
  font-size: 0.88rem;
}
.task-grid {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.task-card {
  margin-bottom: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px 18px;
}
.task-main {
  min-width: 0;
}
h3 {
  margin: 0 0 6px;
  font-size: 1.15rem;
}
.meta-line {
  margin: 0;
  font-size: 0.88rem;
  line-height: 1.4;
}
.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
@media (min-width: 768px) {
  .search {
    max-width: 280px;
  }
  .task-card {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }
}
</style>
