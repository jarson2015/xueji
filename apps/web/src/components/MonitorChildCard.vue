<template>
  <div
    class="card-panel hero-card"
    :class="{ 'needs-attention': needsAttention }"
  >
    <div class="hero-top">
      <h3>{{ child.name }}</h3>
      <span v-if="isTv" class="tv-status">{{ tvStatus }}</span>
      <span v-else class="muted">{{ phoneStatus }}</span>
    </div>

    <div v-if="child.stats.due > 0" class="progress-block">
      <div
        class="progress-bar"
        role="progressbar"
        :aria-valuenow="child.stats.done"
        :aria-valuemax="child.stats.due"
      >
        <div
          class="progress-fill"
          :style="{
            width: `${Math.min(100, Math.round((child.stats.done / child.stats.due) * 100))}%`,
          }"
        />
      </div>
      <p class="muted rhythm-line">
        已完成 {{ child.stats.done }} / {{ child.stats.due }} 件
        <template v-if="child.stats.streak > 0"> · 连续 {{ child.stats.streak }} 天</template>
      </p>
    </div>

    <div v-if="!isTv && chips.length" class="category-row">
      <span v-for="chip in chips" :key="chip.key" class="category-chip">
        {{ chip.label }} {{ chip.done }}/{{ chip.due }}
      </span>
    </div>

    <div v-if="child.isRestDay" class="muted rest-note">学习可以放松；家务和习惯照常</div>

    <div
      v-if="!isTv"
      class="theme-row"
      role="button"
      tabindex="0"
      @click="$emit('theme', child)"
      @keydown.enter="$emit('theme', child)"
    >
      <span v-if="child.weekTheme?.themeTitle">
        本周主题 · {{ child.weekTheme.themeTitle }}
      </span>
      <span v-else class="muted">还没定本周主题</span>
      <span class="muted tiny">{{ child.weekTheme?.themeTitle ? '去改' : '定一个' }} ›</span>
    </div>

    <div v-if="visibleActive.length" class="task-list">
      <div class="todo-label">待完成</div>
      <div
        v-for="t in visibleActive"
        :key="`${t.kind}-${t.id}`"
        class="task-row"
        :class="{ 'task-row-clickable': !isTv }"
        @click="$emit('task-click', child, t)"
      >
        <div class="task-main">
          <span class="task-title">{{ t.title }}</span>
          <span class="muted task-meta">
            <template v-if="isTv">{{ statusLabel(t.status) }}</template>
            <template v-else>
              {{ labelCategory(t.category) }}
              <template
                v-if="t.kind === 'task' && t.progressPercent > 0 && t.status !== 'done'"
              >
                · {{ Math.round(t.progressPercent) }}%
              </template>
            </template>
          </span>
          <span
            v-if="!isTv && t.stuckStep && t.status === 'in_progress'"
            class="muted stuck-hint"
          >
            当前步骤：{{ t.stuckStep.title }}
          </span>
        </div>
        <el-tag v-if="!isTv" size="small" :type="statusTagType(t.status)" effect="plain">
          {{ statusLabel(t.status) }}
        </el-tag>
        <span v-else-if="t.kind === 'task' && t.progressPercent > 0" class="tv-pct">
          {{ Math.round(t.progressPercent) }}%
        </span>
      </div>
      <el-button
        v-if="!isTv && hiddenActive > 0"
        text
        type="primary"
        class="tap-btn expand-btn"
        @click.stop="$emit('toggle-expand')"
      >
        展开全部 {{ incomplete.length }} 项待完成
      </el-button>
      <el-button
        v-else-if="!isTv && expanded && incomplete.length > ACTIVE_TASK_LIMIT"
        text
        type="primary"
        class="tap-btn expand-btn"
        @click.stop="$emit('toggle-expand')"
      >
        收起
      </el-button>
    </div>

    <div
      v-if="!isTv && !visibleActive.length && completed.length"
      class="muted done-soft"
      style="margin-top: 10px"
    >
      今天都完成啦，真棒
    </div>
    <div
      v-else-if="!visibleActive.length && !completed.length && child.isRestDay"
      class="muted done-soft"
      style="margin-top: 10px"
    >
      暂无家务/习惯待办
    </div>
    <div
      v-else-if="
        !visibleActive.length && !completed.length && child.stats.due === 0 && !child.isRestDay
      "
      class="muted done-soft"
      style="margin-top: 10px"
    >
      今天暂无安排
    </div>

    <div v-if="!isTv && completed.length" class="done-fold">
      <el-button
        text
        type="primary"
        class="tap-btn done-fold-toggle"
        @click.stop="$emit('toggle-done-expand')"
      >
        {{ doneExpanded ? '收起' : `今日已完成 ${completed.length} 件` }}
      </el-button>
      <div v-show="doneExpanded" class="task-list done-list">
        <div
          v-for="t in completed"
          :key="`done-${t.kind}-${t.id}`"
          class="task-row task-row-done task-row-clickable"
          @click="$emit('task-click', child, t)"
        >
          <div class="task-main">
            <span class="task-title">{{ t.title }}</span>
            <span class="muted task-meta">{{ labelCategory(t.category) }}</span>
          </div>
          <el-tag size="small" type="success" effect="plain">已完成</el-tag>
        </div>
      </div>
    </div>

    <div v-if="!isTv && child.deferredToday?.length" class="deferred-block">
      <div class="todo-label muted">今日缓做</div>
      <div v-for="t in child.deferredToday" :key="t.id" class="task-row muted">
        {{ t.title }}
      </div>
    </div>

    <div v-if="!isTv && showLightActions" class="card-actions light-actions">
      <p v-if="nudgeCooldown" class="muted tiny nudge-cooldown-hint" role="status">
        {{ nudgeCooldown }}
      </p>
      <div class="light-actions-row">
        <el-button
          v-if="hiddenActive > 0"
          text
          type="primary"
          class="tap-btn"
          @click="$emit('toggle-expand')"
        >
          查看全部待完成
        </el-button>
        <el-button
          v-if="canNudge"
          class="tap-btn"
          :loading="nudging"
          @click="$emit('nudge', child)"
        >
          轻轻提醒一下
        </el-button>
        <el-button
          v-if="hasTasks"
          text
          type="primary"
          class="tap-btn"
          @click="$emit('go-tasks', child)"
        >
          去任务清单
        </el-button>
      </div>
    </div>

    <button
      v-if="footnote"
      type="button"
      class="muted timeline-footnote"
      role="button"
      :aria-label="`查看 ${child.name} 的家庭动态`"
      @click="$emit('focus-feed', child)"
    >
      最近 · {{ timelineRowHint(footnote) }} · {{ timelineRowText(footnote) }}
      <span class="footnote-time">{{ formatTime(footnote.at) }}</span>
      <span class="footnote-go">查看 ›</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { labelCategory } from '../composables/taskLabels'
import { timelineRowHint, timelineRowText } from '../composables/monitorTimeline'
import type {
  MonitorChild,
  MonitorEvent,
  MonitorItemStatus,
  MonitorTodayItem,
} from '../types/monitor'

const ACTIVE_TASK_LIMIT = 5

const props = defineProps<{
  child: MonitorChild
  isTv: boolean
  needsAttention: boolean
  expanded: boolean
  doneExpanded: boolean
  nudging: boolean
  nudgeCooldown: string
  canNudge: boolean
  tvStatus: string
  footnote: MonitorEvent | null
}>()

defineEmits<{
  theme: [c: MonitorChild]
  'task-click': [c: MonitorChild, t: MonitorTodayItem]
  'toggle-expand': []
  'toggle-done-expand': []
  nudge: [c: MonitorChild]
  'go-tasks': [c: MonitorChild]
  'focus-feed': [c: MonitorChild]
}>()

const incomplete = computed(() =>
  (props.child.todayTasks || []).filter((t) => t.status !== 'done'),
)
const completed = computed(() =>
  (props.child.todayTasks || []).filter((t) => t.status === 'done'),
)
const visibleActive = computed(() => {
  const list = incomplete.value
  if (props.isTv) return list.slice(0, 4)
  if (props.expanded) return list
  return list.slice(0, ACTIVE_TASK_LIMIT)
})
const hiddenActive = computed(() => {
  if (props.isTv || props.expanded) return 0
  return Math.max(0, incomplete.value.length - ACTIVE_TASK_LIMIT)
})
const hasTasks = computed(() => (props.child.todayTasks?.length || 0) > 0)
const showLightActions = computed(
  () =>
    hiddenActive.value > 0 ||
    props.canNudge ||
    !!props.nudgeCooldown ||
    hasTasks.value,
)

const chips = computed(() => {
  const bc = props.child.byCategory || {}
  const keys = [
    { key: 'study', label: '学习' },
    { key: 'chore', label: '家务' },
    { key: 'routine', label: '习惯' },
    { key: 'eq', label: '情商' },
  ] as const
  return keys
    .map(({ key, label }) => ({
      key,
      label,
      due: bc[key]?.due || 0,
      done: bc[key]?.done || 0,
    }))
    .filter((x) => x.due > 0)
})

const phoneStatus = computed(() => {
  const c = props.child
  if (c.stats.pendingConfirms) return `${c.stats.pendingConfirms} 待确认`
  if (c.isRestDay) return '休息日'
  if (c.stats.due > 0 && c.stats.done >= c.stats.due) return '今天都顾上了'
  if (c.stats.due > 0) return '还可以一起做'
  return '今天暂无安排'
})

function statusLabel(status: MonitorItemStatus) {
  const map: Record<MonitorItemStatus, string> = {
    todo: '未开始',
    in_progress: '进行中',
    pending_confirm: '待确认',
    done: '已完成',
    deferred: '缓做',
  }
  return map[status] || status
}

function statusTagType(status: MonitorItemStatus) {
  if (status === 'pending_confirm') return 'warning'
  if (status === 'done') return 'success'
  if (status === 'in_progress') return 'primary'
  if (status === 'deferred') return 'info'
  return 'info'
}

function formatTime(v: string) {
  try {
    const d = new Date(v)
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  } catch {
    return ''
  }
}
</script>

<style scoped>
.hero-card {
  margin-bottom: 0;
  animation: soft-fade 0.4s ease;
}
.hero-card.needs-attention {
  border-color: color-mix(in srgb, var(--warn, #c47b3a) 35%, var(--line));
}
.hero-top {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
}
.hero-top h3 {
  margin: 0;
  font-size: 1.2rem;
  font-family: var(--font-display);
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
.rhythm-line {
  margin: 6px 0 0;
  font-size: 0.95rem;
}
.category-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 10px;
}
.category-chip {
  font-size: 0.82rem;
  padding: 2px 8px;
  border-radius: 999px;
  background: var(--warm);
  border: 1px solid var(--warm-line);
}
.theme-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  margin: 8px 0;
  padding: 8px 0;
  border-top: 1px dashed var(--line);
  border-bottom: 1px dashed var(--line);
  cursor: pointer;
  min-height: var(--tap-min, 44px);
}
.task-list {
  margin-top: 12px;
}
.todo-label {
  font-weight: 600;
  margin-bottom: 4px;
}
.task-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 8px 0;
  border-bottom: 1px dashed var(--line);
}
.task-row-clickable {
  cursor: pointer;
}
.task-row.muted {
  cursor: default;
}
.task-main {
  min-width: 0;
  flex: 1;
}
.task-title {
  display: block;
  font-weight: 600;
}
.task-meta {
  font-size: 0.85rem;
}
.stuck-hint {
  display: block;
  margin-top: 4px;
  font-size: 0.85rem;
  color: var(--accent-strong, #2f6f56);
}
.expand-btn {
  margin-top: 4px;
}
.done-fold {
  margin-top: 8px;
}
.done-fold-toggle {
  padding-left: 0;
  font-weight: 600;
}
.done-list {
  margin-top: 4px;
}
.task-row-done {
  opacity: 0.85;
}
.deferred-block {
  margin-top: 12px;
  padding-top: 8px;
  border-top: 1px solid var(--line);
}
.card-actions {
  margin-top: 12px;
}
.light-actions {
  margin-top: 12px;
  padding-top: 8px;
  border-top: 1px dashed var(--line);
}
.nudge-cooldown-hint {
  margin: 0 0 6px;
  font-size: 0.85rem;
}
.light-actions-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}
.timeline-footnote {
  display: block;
  width: 100%;
  margin: 10px 0 0;
  padding: 8px 0 0;
  border: none;
  border-top: 1px dashed var(--line, #d8e0d6);
  background: transparent;
  text-align: left;
  font: inherit;
  font-size: 0.88rem;
  line-height: 1.45;
  color: inherit;
  cursor: pointer;
}
.timeline-footnote:hover .footnote-go,
.timeline-footnote:focus-visible .footnote-go {
  text-decoration: underline;
}
.footnote-time {
  margin-left: 6px;
  font-size: 0.82rem;
}
.footnote-go {
  margin-left: 8px;
  color: var(--accent-strong, #2d6b52);
  font-weight: 600;
}
.tv-status {
  font-weight: 600;
}
.tv-pct {
  font-weight: 600;
  color: var(--muted);
}
.rest-note {
  margin: 6px 0;
}
.done-soft {
  font-size: 0.95rem;
}
@keyframes soft-fade {
  from {
    opacity: 0;
    transform: translateY(4px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}
</style>
