<template>
  <Teleport to="body">
    <Transition name="stay-fade">
      <div
        v-if="visible && message"
        class="soft-stay"
        role="status"
        aria-live="polite"
      >
        <span class="soft-stay-msg">{{ message }}</span>
        <button type="button" class="soft-stay-ok" aria-label="知道了，关闭提醒" @click="dismiss">
          知道了
        </button>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'
import { softStayOwnsEscape } from '../composables/softOverlay'

const props = withDefaults(
  defineProps<{
    message: string
    /** Auto dismiss ms; 0 = stay until dismiss */
    durationMs?: number
  }>(),
  { durationMs: 3200 },
)

const emit = defineEmits<{
  'update:message': [v: string]
  dismiss: []
}>()

const visible = ref(false)
let timer: ReturnType<typeof setTimeout> | null = null

watch(
  () => props.message,
  (msg) => {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
    visible.value = !!msg
    if (msg && props.durationMs > 0) {
      timer = setTimeout(() => dismiss(), props.durationMs)
    }
  },
  { immediate: true },
)

function dismiss() {
  if (timer) {
    clearTimeout(timer)
    timer = null
  }
  visible.value = false
  emit('update:message', '')
  emit('dismiss')
}

function onKeydown(e: KeyboardEvent) {
  if (e.key !== 'Escape') return
  if (!visible.value || !props.message) return
  // SoftPrompt (z-index 4100) owns Esc when open
  if (!softStayOwnsEscape()) return
  e.preventDefault()
  dismiss()
}

window.addEventListener('keydown', onKeydown)

onBeforeUnmount(() => {
  if (timer) clearTimeout(timer)
  window.removeEventListener('keydown', onKeydown)
})
</script>

<style scoped>
.soft-stay {
  position: fixed;
  left: 50%;
  bottom: calc(72px + env(safe-area-inset-bottom, 0px));
  transform: translateX(-50%);
  z-index: 4050;
  display: flex;
  align-items: center;
  gap: 12px;
  max-width: min(420px, calc(100vw - 24px));
  padding: 12px 14px;
  background: var(--celebrate-warm, #fff6e8);
  border: 1px solid var(--warm-line, #f0dfc2);
  border-radius: 14px;
  box-shadow: 0 8px 28px rgba(28, 43, 36, 0.16);
  color: var(--ink);
}
.soft-stay-msg {
  flex: 1;
  font-size: 0.95rem;
  line-height: 1.4;
}
.soft-stay-ok {
  flex-shrink: 0;
  border: none;
  background: var(--accent);
  color: #fff;
  font: inherit;
  font-size: 0.88rem;
  padding: 8px 12px;
  border-radius: 999px;
  min-height: 40px;
  cursor: pointer;
}
.stay-fade-enter-active,
.stay-fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.stay-fade-enter-from,
.stay-fade-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(8px);
}
@media (min-width: 900px) {
  .soft-stay {
    bottom: 28px;
  }
}
</style>
