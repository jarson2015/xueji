<template>
  <div class="empty card-panel" :class="{ hero }">
    <h3 v-if="title">{{ title }}</h3>
    <p class="muted">{{ description }}</p>
    <div v-if="actionLabel" class="empty-actions">
      <el-button type="primary" class="tap-btn" @click="$emit('action')">
        {{ actionLabel }}
      </el-button>
      <el-button v-if="secondaryLabel" class="tap-btn" @click="$emit('secondary')">
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
  }>(),
  { title: '', actionLabel: '', secondaryLabel: '', hero: false },
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
h3 {
  margin: 0 0 8px;
  font-family: var(--font-display);
  font-size: 1.25rem;
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
