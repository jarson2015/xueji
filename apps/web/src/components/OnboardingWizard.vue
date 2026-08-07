<template>
  <Teleport to="body">
    <div v-if="open" class="ob-mask" role="dialog" aria-modal="true" :aria-label="title">
      <div class="ob-card">
        <div class="ob-progress" aria-hidden="true">
          <span
            v-for="i in total"
            :key="i"
            class="ob-dot"
            :class="{ on: i - 1 <= current }"
          />
        </div>
        <p class="ob-kicker">{{ kicker }}</p>
        <h2 class="ob-title">{{ title }}</h2>
        <p class="ob-body">{{ body }}</p>
        <ul v-if="bullets?.length" class="ob-list">
          <li v-for="(b, i) in bullets" :key="i">{{ b }}</li>
        </ul>
        <div class="ob-actions">
          <el-button
            v-if="primaryLabel"
            type="primary"
            class="tap-btn full-tap"
            @click="$emit('primary')"
          >
            {{ primaryLabel }}
          </el-button>
          <el-button v-if="secondaryLabel" class="tap-btn full-tap" @click="$emit('secondary')">
            {{ secondaryLabel }}
          </el-button>
          <el-button text type="primary" class="skip" @click="$emit('skip')">
            {{ skipLabel }}
          </el-button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
defineProps<{
  open: boolean
  current: number
  total: number
  kicker?: string
  title: string
  body: string
  bullets?: string[]
  primaryLabel?: string
  secondaryLabel?: string
  skipLabel?: string
}>()

defineEmits<{
  primary: []
  secondary: []
  skip: []
}>()
</script>

<style scoped>
.ob-mask {
  position: fixed;
  inset: 0;
  z-index: 4000;
  background: rgba(28, 43, 36, 0.55);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: 16px;
  padding-bottom: calc(16px + env(safe-area-inset-bottom, 0px));
}
.ob-card {
  width: min(440px, 100%);
  background: #fff;
  border-radius: 20px 20px 16px 16px;
  padding: 22px 20px 16px;
  box-shadow: 0 16px 48px rgba(28, 43, 36, 0.22);
  animation: ob-up 0.35s ease;
}
.ob-progress {
  display: flex;
  gap: 6px;
  margin-bottom: 14px;
}
.ob-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--line);
}
.ob-dot.on {
  background: var(--accent);
}
.ob-kicker {
  margin: 0 0 6px;
  color: var(--accent);
  font-weight: 700;
  font-size: 0.85rem;
}
.ob-title {
  margin: 0 0 10px;
  font-family: var(--font-display);
  font-size: 1.45rem;
  line-height: 1.3;
}
.ob-body {
  margin: 0 0 12px;
  color: var(--muted);
  line-height: 1.55;
}
.ob-list {
  margin: 0 0 16px;
  padding-left: 1.1rem;
  color: var(--ink);
  line-height: 1.6;
}
.ob-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.full-tap {
  width: 100%;
}
.skip {
  margin-top: 2px;
}
@keyframes ob-up {
  from {
    opacity: 0;
    transform: translateY(24px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
@media (min-width: 768px) {
  .ob-mask {
    align-items: center;
  }
  .ob-card {
    border-radius: 20px;
  }
}
</style>
