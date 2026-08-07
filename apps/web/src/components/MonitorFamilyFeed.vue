<template>
  <div class="card-panel activity family-feed">
    <h3 class="feed-heading">
      家庭动态
      <span v-if="scopeLabel" class="muted feed-scope">{{ scopeLabel }}</span>
    </h3>
    <div v-for="ev in visible" :key="ev.id" class="timeline-row feed-timeline-row">
      <div class="timeline-main">
        <strong v-if="showStudentName" class="feed-student">{{ ev.studentName }}</strong>
        <span class="timeline-kind">{{ timelineRowHint(ev) }}</span>
        <span>{{ timelineRowText(ev) }}</span>
        <el-tag
          v-if="ev.confirmStatus === 'rejected'"
          size="small"
          type="warning"
          effect="plain"
        >
          已退回
        </el-tag>
      </div>
      <span class="muted time">{{ formatTime(ev.at) }}</span>
    </div>
    <el-button
      v-if="hasMore && !expanded"
      text
      type="primary"
      class="tap-btn expand-btn"
      @click="expanded = true"
    >
      查看更多动态（{{ events.length - visible.length }} 条）
    </el-button>
    <el-button
      v-else-if="expanded && events.length > COLLAPSED_LIMIT"
      text
      type="primary"
      class="tap-btn expand-btn"
      @click="expanded = false"
    >
      收起
    </el-button>
    <div v-if="!events.length">
      <EmptyState :title="emptyTitle" :description="emptyDescription" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import EmptyState from './EmptyState.vue'
import { timelineRowHint, timelineRowText } from '../composables/monitorTimeline'
import type { MonitorEvent } from '../types/monitor'

const COLLAPSED_LIMIT = 5
const EXPANDED_LIMIT = 12

const props = defineProps<{
  events: MonitorEvent[]
  scopeLabel: string
  showStudentName: boolean
  emptyTitle: string
  emptyDescription: string
}>()

const expanded = defineModel<boolean>('expanded', { default: false })

const visible = computed(() => {
  const limit = expanded.value ? EXPANDED_LIMIT : COLLAPSED_LIMIT
  return props.events.slice(0, limit)
})

const hasMore = computed(() => props.events.length > visible.value.length)

function formatTime(v: string) {
  const d = new Date(v)
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(
    d.getMinutes(),
  ).padStart(2, '0')}`
}
</script>

<style scoped>
.family-feed {
  margin-bottom: 14px;
}
.feed-heading {
  display: flex;
  align-items: baseline;
  gap: 8px;
  flex-wrap: wrap;
  margin: 0 0 10px;
  font-size: 1.2rem;
  font-family: var(--font-display);
}
.feed-scope {
  font-size: 0.9rem;
  font-weight: 400;
}
.feed-timeline-row {
  padding: 8px 0;
}
.feed-student {
  margin-right: 6px;
  font-size: 0.92rem;
}
.timeline-row {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  padding: 6px 0;
  font-size: 0.92rem;
}
.timeline-main {
  min-width: 0;
  flex: 1;
}
.timeline-kind {
  display: inline-block;
  margin-right: 6px;
  font-size: 0.78rem;
  color: var(--accent-strong, #2f6f56);
  font-weight: 600;
}
.time {
  white-space: nowrap;
  font-size: 0.85rem;
}
.expand-btn {
  margin-top: 4px;
}
</style>
