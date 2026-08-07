<template>
  <Teleport to="body">
    <div
      v-if="modelValue"
      ref="maskRef"
      class="sp-mask"
      role="dialog"
      aria-modal="true"
      :aria-labelledby="titleId"
      :aria-describedby="message ? descId : undefined"
      tabindex="-1"
      @click.self="onCancel"
      @keydown="onKeydown"
    >
      <div ref="cardRef" class="sp-card" :class="{ kid: kidMode }">
        <h3 :id="titleId" class="sp-title">{{ title }}</h3>
        <p v-if="message" :id="descId" class="sp-msg">{{ message }}</p>
        <div v-if="templates?.length" class="sp-templates">
          <button
            v-for="(t, i) in templates"
            :key="i"
            type="button"
            class="sp-chip"
            @click="note = t"
          >
            {{ t }}
          </button>
        </div>
        <el-input
          v-if="showInput"
          ref="inputRef"
          v-model="note"
          type="textarea"
          :rows="kidMode ? 2 : 3"
          :placeholder="placeholder"
          size="large"
          class="sp-input"
        />
        <p v-if="requireNote && showInput && !note.trim()" class="sp-hint">{{ hint || '写一句给对方，沟通更顺畅' }}</p>
        <div class="sp-actions">
          <el-button class="tap-btn" :class="{ 'full-tap': kidMode }" @click="onCancel">
            {{ cancelText }}
          </el-button>
          <el-button
            ref="confirmRef"
            type="primary"
            class="tap-btn"
            :class="{ 'full-tap': kidMode }"
            :disabled="requireNote && showInput && !note.trim()"
            @click="onConfirm"
          >
            {{ confirmText }}
          </el-button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'

const props = withDefaults(
  defineProps<{
    modelValue: boolean
    title: string
    message?: string
    placeholder?: string
    confirmText?: string
    cancelText?: string
    showInput?: boolean
    requireNote?: boolean
    templates?: string[]
    initialNote?: string
    kidMode?: boolean
    /** Override default require-note hint */
    hint?: string
  }>(),
  {
    message: '',
    placeholder: '写一句…',
    confirmText: '确定',
    cancelText: '取消',
    showInput: true,
    requireNote: false,
    templates: () => [],
    initialNote: '',
    kidMode: false,
    hint: '',
  },
)

const emit = defineEmits<{
  'update:modelValue': [v: boolean]
  confirm: [note: string]
  cancel: []
}>()

const note = ref('')
const titleId = `sp-title-${Math.random().toString(36).slice(2, 9)}`
const descId = `sp-desc-${Math.random().toString(36).slice(2, 9)}`
const maskRef = ref<HTMLElement | null>(null)
const cardRef = ref<HTMLElement | null>(null)
const inputRef = ref<{ focus?: () => void; $el?: HTMLElement } | null>(null)
const confirmRef = ref<{ $el?: HTMLElement } | null>(null)
let prevFocus: HTMLElement | null = null

watch(
  () => props.modelValue,
  async (open) => {
    if (open) {
      note.value = props.initialNote || ''
      prevFocus = document.activeElement as HTMLElement | null
      await nextTick()
      focusFirst()
    } else if (prevFocus && typeof prevFocus.focus === 'function') {
      try {
        prevFocus.focus()
      } catch {
        /* ignore */
      }
      prevFocus = null
    }
  },
)

function focusFirst() {
  if (props.showInput) {
    const elInput = inputRef.value
    if (elInput && typeof elInput.focus === 'function') {
      elInput.focus()
      return
    }
    const ta = cardRef.value?.querySelector('textarea') as HTMLElement | null
    if (ta) {
      ta.focus()
      return
    }
  }
  const btn =
    (confirmRef.value?.$el as HTMLElement | undefined) ||
    (cardRef.value?.querySelector('.el-button--primary') as HTMLElement | null)
  if (btn && typeof btn.focus === 'function') btn.focus()
  else maskRef.value?.focus()
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    e.preventDefault()
    onCancel()
    return
  }
  if (e.key !== 'Tab' || !cardRef.value) return
  const focusables = Array.from(
    cardRef.value.querySelectorAll<HTMLElement>(
      'button:not([disabled]), textarea:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  ).filter((el) => el.offsetParent !== null || el === document.activeElement)
  if (!focusables.length) return
  const first = focusables[0]
  const last = focusables[focusables.length - 1]
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault()
    last.focus()
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault()
    first.focus()
  }
}

function onCancel() {
  emit('update:modelValue', false)
  emit('cancel')
}

function onConfirm() {
  if (props.requireNote && props.showInput && !note.value.trim()) return
  emit('confirm', note.value.trim())
  emit('update:modelValue', false)
}
</script>

<style scoped>
.sp-mask {
  position: fixed;
  inset: 0;
  z-index: 4100;
  background: rgba(28, 43, 36, 0.45);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: 16px;
  padding-bottom: calc(16px + env(safe-area-inset-bottom, 0px));
}
.sp-card {
  width: min(420px, 100%);
  background: #fff;
  border-radius: 18px;
  padding: 20px 18px 14px;
  box-shadow: 0 12px 40px rgba(28, 43, 36, 0.2);
}
.sp-card.kid {
  padding: 24px 20px 16px;
  background: var(--celebrate-warm, #fff6e8);
}
.sp-title {
  margin: 0 0 8px;
  font-family: var(--font-display);
  font-size: 1.25rem;
}
.sp-card.kid .sp-title {
  font-size: 1.4rem;
}
.sp-msg {
  margin: 0 0 12px;
  color: var(--muted);
  line-height: 1.5;
  white-space: pre-line;
}
.sp-templates {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 10px;
}
.sp-chip {
  border: 1px solid var(--line);
  background: var(--warm);
  border-radius: 999px;
  padding: 8px 12px;
  font: inherit;
  font-size: 0.88rem;
  color: var(--ink);
  cursor: pointer;
  min-height: 40px;
}
.sp-chip:hover {
  border-color: var(--accent);
  background: var(--accent-soft);
}
.sp-input {
  margin-bottom: 8px;
}
.sp-hint {
  margin: 0 0 8px;
  font-size: 0.85rem;
  color: var(--warn);
}
.sp-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
  margin-top: 8px;
}
.sp-card.kid .sp-actions {
  flex-direction: column-reverse;
}
.full-tap {
  width: 100%;
}
@media (min-width: 768px) {
  .sp-mask {
    align-items: center;
  }
}
</style>
