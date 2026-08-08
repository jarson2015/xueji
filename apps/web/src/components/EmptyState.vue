<template>
  <div
    class="empty card-panel"
    :class="{ hero: hero && tone !== 'error', 'is-error': tone === 'error' }"
    :role="tone === 'error' ? 'alert' : undefined"
  >
    <h3 v-if="title">{{ title }}</h3>
    <p class="muted">{{ description }}</p>
    <div v-if="actionLabel" class="empty-actions">
      <el-button type="primary" class="tap-btn" @click="$emit('action')">
        {{ actionLabel }}
      </el-button>
      <el-button
        v-if="secondaryLabel"
        plain
        class="tap-btn"
        @click="$emit('secondary')"
      >
        {{ secondaryLabel }}
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    title?: string
    description: string
    actionLabel?: string
    secondaryLabel?: string
    hero?: boolean
    /** U1.3：empty 暖色引导；error 警示失败态 */
    tone?: 'empty' | 'error'
  }>(),
  {
    title: '',
    actionLabel: '',
    secondaryLabel: '',
    hero: false,
    tone: 'empty',
  },
)

defineEmits<{ action: []; secondary: [] }>()
</script>

<style scoped>
.empty {
  text-align: center;
  padding: 28px 18px;
}
.empty.hero {
  background: var(--warm);
  border-color: var(--warm-line);
}
.empty.is-error {
  background: linear-gradient(160deg, #fff8ef 0%, #fff 70%);
  border-color: color-mix(in srgb, var(--warn, #b88230) 42%, var(--line));
}
h3 {
  margin: 0 0 8px;
  font-family: var(--font-display);
  font-size: 1.25rem;
}
.empty.is-error h3 {
  color: var(--accent-strong, #1f4d36);
}
p {
  margin: 0 0 14px;
  line-height: 1.55;
}
.empty-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: center;
}
</style>
