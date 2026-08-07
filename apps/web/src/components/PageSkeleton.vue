<template>
  <div class="page-skeleton" :class="{ compact }" aria-busy="true" aria-label="加载中">
    <div v-if="hero" class="skeleton-block sk-hero" />
    <div class="sk-row" v-for="n in rows" :key="n">
      <div class="skeleton-block sk-line" :style="{ width: lineWidth(n) }" />
      <div class="skeleton-block sk-line short" />
    </div>
  </div>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    rows?: number
    hero?: boolean
    compact?: boolean
  }>(),
  { rows: 4, hero: true, compact: false },
)

function lineWidth(n: number) {
  const widths = ['92%', '78%', '88%', '70%', '84%', '76%']
  return widths[(n - 1) % widths.length]
}
</script>

<style scoped>
.page-skeleton {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 4px 0 16px;
}
.page-skeleton.compact {
  gap: 8px;
}
.sk-hero {
  min-height: 96px;
}
.sk-row {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 14px 16px;
  border-radius: var(--radius);
  border: 1px solid var(--line);
  background: var(--panel, #fff);
}
.sk-line {
  min-height: 14px;
  height: 14px;
}
.sk-line.short {
  width: 48% !important;
  min-height: 10px;
  height: 10px;
  opacity: 0.85;
}
</style>
