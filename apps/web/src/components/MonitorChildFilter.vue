<template>
  <div class="card-panel child-filter">
    <el-radio-group v-model="model" class="child-filter-group">
      <el-radio-button :value="0">全部</el-radio-button>
      <el-radio-button
        v-for="c in children"
        :key="c.studentId"
        :value="c.studentId"
      >
        {{ c.name }}
        <span v-if="c.stats.pendingConfirms" class="filter-badge">
          {{ c.stats.pendingConfirms }}
        </span>
      </el-radio-button>
    </el-radio-group>
  </div>
</template>

<script setup lang="ts">
import type { MonitorChild } from '../types/monitor'

defineProps<{
  children: MonitorChild[]
}>()

const model = defineModel<number>({ default: 0 })
</script>

<style scoped>
.child-filter {
  margin-bottom: 12px;
  padding: 10px 12px;
}
.child-filter-group {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.filter-badge {
  display: inline-block;
  margin-left: 4px;
  min-width: 16px;
  padding: 0 5px;
  border-radius: 999px;
  background: var(--warn, #c47b3a);
  color: #fff;
  font-size: 0.75rem;
  line-height: 1.4;
  text-align: center;
}
</style>
