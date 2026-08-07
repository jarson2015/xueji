<template>
  <div
    class="focus"
    :class="{
      running: isRunning,
      collapsed: collapsed && !isRunning && !justFinished,
      done: justFinished,
    }"
  >
    <button
      v-if="collapsed && !isRunning && !justFinished"
      type="button"
      class="focus-toggle"
      @click="collapsed = false"
    >
      <span class="focus-label">用番茄专注</span>
      <span class="muted tiny">可选 · 展开计时</span>
    </button>

    <template v-else>
      <div class="focus-head">
        <span class="focus-label">{{ justFinished ? '专注结束' : '专注番茄' }}</span>
        <el-radio-group
          v-if="!isRunning && !justFinished"
          v-model="minutes"
          size="small"
          @change="onPreset"
        >
          <el-radio-button :value="15">15分</el-radio-button>
          <el-radio-button :value="25">25分</el-radio-button>
          <el-radio-button :value="45">45分</el-radio-button>
        </el-radio-group>
        <el-button
          v-if="!isRunning && !justFinished && allowCollapse"
          text
          type="primary"
          class="tap-btn"
          @click="collapsed = true"
        >
          收起
        </el-button>
      </div>

      <div v-if="justFinished" class="focus-done-banner" role="status" aria-live="assertive">
        <strong>时间到啦</strong>
        <p class="muted tip">可以点下面的「我做完了」告诉家长</p>
      </div>

      <template v-else>
        <div class="focus-time" aria-live="polite">{{ display }}</div>
        <el-progress
          :percentage="percent"
          :stroke-width="8"
          :show-text="false"
          color="var(--accent)"
        />
        <div class="focus-actions">
          <el-button
            v-if="!isRunning"
            type="primary"
            class="tap-btn"
            @click="start"
          >
            开始专注
          </el-button>
          <template v-else>
            <el-button class="tap-btn" @click="pause">
              {{ paused ? '继续' : '暂停' }}
            </el-button>
            <el-button class="tap-btn" @click="stop">结束</el-button>
          </template>
        </div>
      </template>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import {
  getFocusVoiceEnabled,
  runFocusFinishFeedback,
} from '../composables/focusPrefs'

const props = withDefaults(
  defineProps<{
    itemKey: string
    title: string
    /** 默认折叠，避免和「我做完了」抢戏 */
    startCollapsed?: boolean
    ageBand?: string
  }>(),
  {
    startCollapsed: true,
    ageBand: 'general',
  },
)

const emit = defineEmits<{
  finished: []
  clearFinished: []
}>()

const STORAGE_PRESET = 'focusPresetMinutes'
const STORAGE_SESSION = 'focusSession'
/** UI tick interval */
const TICK_MS = 500
/** Throttle localStorage writes while running */
const PERSIST_MS = 1500

const collapsed = ref(!!props.startCollapsed)
const allowCollapse = computed(() => !!props.startCollapsed)
const minutes = ref(Number(localStorage.getItem(STORAGE_PRESET) || 25))
const remainMs = ref(minutes.value * 60 * 1000)
const isRunning = ref(false)
const paused = ref(false)
const justFinished = ref(false)
let tick: number | undefined
let endsAt = 0
let lastPersistAt = 0

const display = computed(() => {
  const total = Math.max(0, Math.ceil(remainMs.value / 1000))
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
})

const percent = computed(() => {
  const total = minutes.value * 60 * 1000
  if (!total) return 0
  return Math.min(100, Math.round(((total - remainMs.value) / total) * 100))
})

function persistSession(force = false) {
  if (!isRunning.value) {
    localStorage.removeItem(STORAGE_SESSION)
    lastPersistAt = 0
    return
  }
  const now = Date.now()
  if (!force && now - lastPersistAt < PERSIST_MS) return
  lastPersistAt = now
  localStorage.setItem(
    STORAGE_SESSION,
    JSON.stringify({
      itemKey: props.itemKey,
      title: props.title,
      minutes: minutes.value,
      endsAt,
      paused: paused.value,
      remainMs: remainMs.value,
    }),
  )
}

function clearTick() {
  if (tick) {
    clearInterval(tick)
    tick = undefined
  }
}

function onPreset() {
  localStorage.setItem(STORAGE_PRESET, String(minutes.value))
  if (!isRunning.value) {
    remainMs.value = minutes.value * 60 * 1000
  }
}

function startTick() {
  clearTick()
  tick = window.setInterval(() => {
    if (paused.value) return
    remainMs.value = Math.max(0, endsAt - Date.now())
    persistSession()
    if (remainMs.value <= 0) {
      finish()
    }
  }, TICK_MS)
}

function start() {
  justFinished.value = false
  emit('clearFinished')
  collapsed.value = false
  if (paused.value && isRunning.value) {
    endsAt = Date.now() + remainMs.value
    paused.value = false
    persistSession(true)
    startTick()
    return
  }
  remainMs.value = minutes.value * 60 * 1000
  endsAt = Date.now() + remainMs.value
  isRunning.value = true
  paused.value = false
  persistSession(true)
  startTick()
  ElMessage.success('开始专注，加油')
}

function pause() {
  if (!isRunning.value) return
  if (paused.value) {
    endsAt = Date.now() + remainMs.value
    paused.value = false
    persistSession(true)
    startTick()
  } else {
    remainMs.value = Math.max(0, endsAt - Date.now())
    paused.value = true
    clearTick()
    persistSession(true)
  }
}

function stop() {
  clearTick()
  isRunning.value = false
  paused.value = false
  remainMs.value = minutes.value * 60 * 1000
  localStorage.removeItem(STORAGE_SESSION)
  lastPersistAt = 0
  justFinished.value = false
  emit('clearFinished')
}

function finish() {
  clearTick()
  isRunning.value = false
  paused.value = false
  localStorage.removeItem(STORAGE_SESSION)
  lastPersistAt = 0
  justFinished.value = true
  collapsed.value = false
  ElMessage.success('专注时间到，真棒')
  runFocusFinishFeedback({
    title: props.title,
    voiceEnabled: getFocusVoiceEnabled(props.ageBand),
  })
  emit('finished')
}

function restore() {
  try {
    const raw = localStorage.getItem(STORAGE_SESSION)
    if (!raw) return
    const s = JSON.parse(raw)
    if (s.itemKey !== props.itemKey) {
      return
    }
    minutes.value = s.minutes || 25
    collapsed.value = false
    if (s.paused) {
      isRunning.value = true
      paused.value = true
      remainMs.value = s.remainMs || 0
      return
    }
    endsAt = s.endsAt
    remainMs.value = Math.max(0, endsAt - Date.now())
    if (remainMs.value <= 0) {
      finish()
      return
    }
    isRunning.value = true
    paused.value = false
    startTick()
  } catch {
    localStorage.removeItem(STORAGE_SESSION)
  }
}

watch(
  () => props.itemKey,
  () => {
    stop()
    collapsed.value = !!props.startCollapsed
    restore()
  },
)

watch(
  () => props.startCollapsed,
  (v) => {
    if (!isRunning.value && !justFinished.value) {
      collapsed.value = !!v
    }
  },
)

onMounted(restore)
onUnmounted(clearTick)

defineExpose({ justFinished })
</script>

<style scoped>
.focus {
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px dashed var(--line);
  text-align: left;
}
.focus.collapsed {
  padding-top: 10px;
}
.focus-toggle {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  border: 0;
  background: var(--accent-soft, #eef6f1);
  border-radius: 12px;
  padding: 12px 14px;
  cursor: pointer;
  font: inherit;
  color: inherit;
  min-height: var(--tap-min, 48px);
}
.focus-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
}
.focus-label {
  font-weight: 700;
  color: var(--accent);
  font-size: 0.95rem;
}
.focus-time {
  font-size: clamp(2rem, 6vw, 2.6rem);
  font-weight: 800;
  letter-spacing: 0.06em;
  text-align: center;
  font-variant-numeric: tabular-nums;
  margin: 6px 0 10px;
  color: var(--accent-strong);
}
.focus-actions {
  display: flex;
  gap: 8px;
  margin-top: 12px;
  flex-wrap: wrap;
}
.focus-done-banner {
  text-align: center;
  padding: 12px 10px;
  border-radius: 12px;
  background: linear-gradient(160deg, #fff8e8 0%, #fff 90%);
  border: 1px solid rgba(180, 140, 40, 0.28);
}
.focus-done-banner strong {
  font-size: 1.15rem;
  color: var(--accent-strong);
  font-family: var(--font-display);
}
.tip {
  margin: 8px 0 0;
  font-size: 0.9rem;
}
.tiny {
  font-size: 0.85rem;
}
.focus.running .focus-time {
  animation: pulse 1.6s ease-in-out infinite;
}
@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.72;
  }
}
</style>
