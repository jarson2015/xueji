/**
 * 专注结束反馈偏好：语音开关按年龄段默认，可被用户覆盖。
 * young/general 默认开，teen 默认关。
 */
const VOICE_KEY = 'focusVoiceEnabled'

export function getFocusVoiceEnabled(ageBand: string): boolean {
  const raw = localStorage.getItem(VOICE_KEY)
  if (raw === '1' || raw === 'true') return true
  if (raw === '0' || raw === 'false') return false
  return ageBand !== 'teen'
}

export function setFocusVoiceEnabled(on: boolean) {
  localStorage.setItem(VOICE_KEY, on ? '1' : '0')
}

/** 短提示音（两声），不依赖外部音频文件 */
export function playFocusChime() {
  try {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext
    if (!AC) return
    const ctx = new AC()
    const beep = (freq: number, at: number, dur: number) => {
      const o = ctx.createOscillator()
      const g = ctx.createGain()
      o.type = 'sine'
      o.frequency.value = freq
      g.gain.setValueAtTime(0.0001, at)
      g.gain.exponentialRampToValueAtTime(0.12, at + 0.02)
      g.gain.exponentialRampToValueAtTime(0.0001, at + dur)
      o.connect(g)
      g.connect(ctx.destination)
      o.start(at)
      o.stop(at + dur + 0.02)
    }
    const t0 = ctx.currentTime
    beep(880, t0, 0.18)
    beep(1174, t0 + 0.22, 0.22)
    window.setTimeout(() => {
      void ctx.close().catch(() => {})
    }, 800)
  } catch {
    // ignore
  }
}

export function vibrateFocusDone() {
  try {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([180, 80, 180])
    }
  } catch {
    // ignore
  }
}

export function speakFocusDone(title: string) {
  try {
    if (typeof window === 'undefined' || !window.speechSynthesis) return
    window.speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(
      `时间到啦。${title ? `「${title}」` : ''}可以点我做完了`,
    )
    u.lang = 'zh-CN'
    u.rate = 1.05
    u.pitch = 1.05
    window.speechSynthesis.speak(u)
  } catch {
    // ignore
  }
}

/** 专注结束反馈栈：音 + 振 + 可选语音 + 系统通知 */
export function runFocusFinishFeedback(opts: {
  title: string
  voiceEnabled: boolean
}) {
  playFocusChime()
  vibrateFocusDone()
  if (opts.voiceEnabled) {
    speakFocusDone(opts.title)
  }
  try {
    if (
      typeof Notification !== 'undefined' &&
      Notification.permission === 'granted'
    ) {
      new Notification('学迹 · 专注结束', {
        body: `「${opts.title}」时间到啦，可以打卡了`,
        tag: 'focus-done',
      })
    }
  } catch {
    // ignore
  }
}
