<template>
  <section
    v-if="items.length"
    class="card-panel insight-strip"
    :class="`insight-${active?.tone || 'default'}`"
    role="region"
    aria-label="家庭洞察"
  >
    <div class="insight-strip-head">
      <strong class="insight-strip-title">洞察</strong>
      <span v-if="items.length > 1" class="muted tiny">{{ items.length }} 条</span>
    </div>
    <div v-if="items.length > 1" class="insight-chips" role="tablist">
      <button
        v-for="item in items"
        :key="item.id"
        type="button"
        class="insight-chip"
        :class="{ active: activeId === item.id }"
        role="tab"
        :aria-selected="activeId === item.id"
        @click="activeId = item.id"
      >
        {{ item.chip }}
      </button>
    </div>
    <template v-if="active">
      <h4 class="insight-item-title">{{ active.title }}</h4>
      <p class="muted insight-item-msg">{{ active.message }}</p>
      <ul v-if="active.bullets?.length" class="insight-bullets muted tiny">
        <li v-for="(b, i) in active.bullets" :key="i">{{ b }}</li>
      </ul>
      <div class="fade-actions insight-actions">
        <el-button
          v-if="active.primary"
          :type="active.primary.primary ? 'primary' : 'default'"
          class="tap-btn"
          :loading="active.primary.loading ? fadeBusy : false"
          @click="$emit('action', active.primary.action)"
        >
          {{ active.primary.label }}
        </el-button>
        <el-button
          v-if="active.secondary"
          class="tap-btn"
          @click="$emit('action', active.secondary.action)"
        >
          {{ active.secondary.label }}
        </el-button>
        <el-button text class="tap-btn" @click="$emit('dismiss', active.id)">
          本次知道了
        </el-button>
      </div>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'

export type InsightStripItem = {
  id: string
  chip: string
  title: string
  message: string
  bullets?: string[]
  tone: 'warn' | 'accent' | 'coach' | 'default'
  primary?: {
    label: string
    action: string
    primary?: boolean
    loading?: boolean
  }
  secondary?: { label: string; action: string }
}

const props = withDefaults(
  defineProps<{
    items: InsightStripItem[]
    fadeBusy?: boolean
  }>(),
  { fadeBusy: false },
)

const activeId = defineModel<string>('activeId', { default: '' })

defineEmits<{
  action: [action: string]
  dismiss: [id: string]
}>()

const active = computed(() => {
  const list = props.items || []
  if (!list.length) return null
  return list.find((i) => i.id === activeId.value) || list[0]
})
</script>

<style scoped>
.insight-strip {
  margin-top: 4px;
  margin-bottom: 12px;
}
.insight-strip.insight-warn {
  border-color: color-mix(in srgb, var(--warn, #c47b3a) 35%, var(--line));
}
.insight-strip.insight-coach {
  border-color: rgba(60, 100, 140, 0.22);
  background: linear-gradient(160deg, #f5f9ff 0%, #fff 85%);
}
.insight-strip.insight-accent {
  border-color: color-mix(in srgb, var(--accent, #3d8b6e) 35%, var(--line));
}
.insight-strip-head {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 8px;
}
.insight-strip-title {
  font-size: 1.05rem;
  font-family: var(--font-display);
}
.insight-chips {
  display: flex;
  flex-wrap: nowrap;
  gap: 6px;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  margin-bottom: 10px;
  padding-bottom: 2px;
}
.insight-chip {
  flex-shrink: 0;
  border: 1px solid var(--line);
  background: var(--warm, #faf7f2);
  border-radius: 8px;
  padding: 6px 12px;
  font-size: 0.88rem;
  font-weight: 600;
  cursor: pointer;
  min-height: var(--tap-min, 44px);
  color: inherit;
}
.insight-chip.active {
  border-color: var(--accent, #3d8b6e);
  background: color-mix(in srgb, var(--accent, #3d8b6e) 12%, #fff);
  color: var(--accent-strong, #2f6f56);
}
.insight-item-title {
  margin: 0 0 4px;
  font-size: 1rem;
}
.insight-item-msg {
  margin: 0 0 8px;
  line-height: 1.45;
}
.insight-bullets {
  margin: 0 0 10px;
  padding-left: 1.2em;
}
.insight-actions {
  margin-top: 4px;
}
.fade-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
</style>
