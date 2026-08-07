import { computed, ref } from 'vue'

const PARENT_KEY = 'onboardParentV2'
const STUDENT_KEY = 'onboardStudentV2'
/** Legacy one-shot bars — migrate so old users aren't forced through again */
const LEGACY_PARENT = 'guideParentDone'
const LEGACY_STUDENT = 'guideStudentDone'

export type ParentOnboardStep = 0 | 1 | 2 | 3 | 4 | 'done'
export type StudentOnboardStep = 0 | 1 | 2 | 'done'

function readStep(key: string, legacy: string): string {
  const v = localStorage.getItem(key)
  if (v) return v
  if (localStorage.getItem(legacy)) {
    localStorage.setItem(key, 'done')
    return 'done'
  }
  return '0'
}

export function useParentOnboarding() {
  const raw = ref(readStep(PARENT_KEY, LEGACY_PARENT))
  const step = computed<ParentOnboardStep>(() => {
    if (raw.value === 'done') return 'done'
    const n = Number(raw.value)
    if (n >= 4) return 'done'
    return (Number.isFinite(n) ? n : 0) as ParentOnboardStep
  })
  const active = computed(() => step.value !== 'done')

  function setStep(s: ParentOnboardStep) {
    const v = s === 'done' ? 'done' : String(s)
    localStorage.setItem(PARENT_KEY, v)
    localStorage.setItem(LEGACY_PARENT, '1')
    raw.value = v
  }

  function next() {
    if (step.value === 'done') return
    const n = Number(step.value)
    if (n >= 3) setStep('done')
    else setStep((n + 1) as ParentOnboardStep)
  }

  function skip() {
    setStep('done')
  }

  /** Jump to first incomplete step based on real data */
  function syncFromData(opts: { hasStudents: boolean; hasTasks: boolean }) {
    if (step.value === 'done') return
    if (!opts.hasStudents) {
      setStep(0)
      return
    }
    // Has kids but no tasks: land on「把登录码给孩子」(step 1), not skip to publish
    if (!opts.hasTasks) {
      const cur = Number(step.value)
      if (cur < 1) setStep(1)
      return
    }
    // Has students + tasks → optional covenant beat
    const cur = Number(step.value)
    if (cur < 3) setStep(3)
  }

  return { step, active, setStep, next, skip, syncFromData }
}

export function useStudentOnboarding() {
  const raw = ref(readStep(STUDENT_KEY, LEGACY_STUDENT))
  const step = computed<StudentOnboardStep>(() => {
    if (raw.value === 'done') return 'done'
    const n = Number(raw.value)
    if (n >= 2) return 'done'
    return (Number.isFinite(n) ? n : 0) as StudentOnboardStep
  })
  const active = computed(() => step.value !== 'done')

  function setStep(s: StudentOnboardStep) {
    const v = s === 'done' ? 'done' : String(s)
    localStorage.setItem(STUDENT_KEY, v)
    localStorage.setItem(LEGACY_STUDENT, '1')
    raw.value = v
  }

  function next() {
    if (step.value === 'done') return
    const n = Number(step.value)
    if (n >= 1) setStep('done')
    else setStep((n + 1) as StudentOnboardStep)
  }

  function skip() {
    setStep('done')
  }

  /** Call after first successful check-in */
  function completeFromCheckin() {
    setStep('done')
  }

  return { step, active, setStep, next, skip, completeFromCheckin }
}

/** Friendly error text for family users */
export function friendlyError(err: unknown, fallback = '先歇一下，稍后再试'): string {
  const msg =
    typeof err === 'object' && err && 'message' in err
      ? String((err as { message?: string }).message || '')
      : typeof err === 'string'
        ? err
        : ''
  if (!msg) return fallback
  const lower = msg.toLowerCase()
  if (lower.includes('network') || lower.includes('timeout') || msg.includes('网络')) {
    return '网络不太稳，请检查后重试'
  }
  if (msg.includes('401') || msg.includes('未登录') || lower.includes('unauthorized')) {
    return '登录已过期，请重新登录'
  }
  if (
    msg.includes('429') ||
    msg.includes('太频繁') ||
    lower.includes('too many requests')
  ) {
    const wait = msg.match(/(\d+)\s*秒/)
    return wait
      ? `操作有点勤，请 ${wait[1]} 秒后再试`
      : '操作有点勤，请稍后再试'
  }
  if (msg.includes('403') || msg.includes('权限')) {
    return '暂时没有权限做这件事'
  }
  // Keep short product messages; soften raw technical ones
  if (msg.length > 80 || /Exception|Error:|ECONN|SQL/i.test(msg)) {
    return fallback
  }
  return msg
}
