import { computed, onMounted, ref } from 'vue'

export type Breakpoint = 'phone' | 'tablet' | 'desktop' | 'tv'

const TV_MODE_KEY = 'xueji_tv_mode'

/** 显式客厅 TV：localStorage 或 URL ?tv=1（写入后刷新仍有效） */
export function isTvModeOptIn(): boolean {
  if (typeof window === 'undefined') return false
  try {
    const q = new URLSearchParams(window.location.search)
    if (q.get('tv') === '1' || q.get('tv') === 'true') {
      localStorage.setItem(TV_MODE_KEY, '1')
      return true
    }
    if (q.get('tv') === '0' || q.get('tv') === 'false') {
      localStorage.removeItem(TV_MODE_KEY)
      return false
    }
  } catch {
    /* ignore */
  }
  return localStorage.getItem(TV_MODE_KEY) === '1'
}

export function setTvModeOptIn(on: boolean) {
  if (typeof window === 'undefined') return
  if (on) localStorage.setItem(TV_MODE_KEY, '1')
  else localStorage.removeItem(TV_MODE_KEY)
  onResize()
}

function resolve(width: number): Breakpoint {
  if (width < 768) return 'phone'
  if (width < 1200) return 'tablet'
  // ≥1200 默认 desktop（含大显示器）。仅显式 TV 模式才收口客厅壳。
  if (isTvModeOptIn()) return 'tv'
  return 'desktop'
}

const width = ref(typeof window !== 'undefined' ? window.innerWidth : 1200)
const bp = ref<Breakpoint>(resolve(width.value))

function onResize() {
  width.value = window.innerWidth
  bp.value = resolve(width.value)
}

let listening = false

function ensureListen() {
  if (listening || typeof window === 'undefined') return
  listening = true
  window.addEventListener('resize', onResize, { passive: true })
}

export function useBreakpoint() {
  onMounted(() => {
    ensureListen()
    onResize()
  })

  const isPhone = computed(() => bp.value === 'phone')
  const isTablet = computed(() => bp.value === 'tablet')
  const isDesktop = computed(() => bp.value === 'desktop')
  const isTv = computed(() => bp.value === 'tv')
  const isCompact = computed(() => bp.value === 'phone')
  const isWide = computed(() => bp.value === 'desktop' || bp.value === 'tv')

  return {
    width,
    bp,
    isPhone,
    isTablet,
    isDesktop,
    isTv,
    isCompact,
    isWide,
  }
}
