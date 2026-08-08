<template>
  <!-- 小屏：投屏前闸门；U4.2 品牌「学迹」为 display 级 -->
  <div v-if="needsGate && !gatePassed" class="ritual-gate page">
    <div class="gate-card card-panel">
      <h1 class="gate-brand">学迹</h1>
      <p class="gate-kicker muted">客厅仪式屏</p>
      <p class="gate-title">适合投到电视上看</p>
      <p class="muted gate-body">
        自动轮播今日节奏与周末骄傲。投到电视上看；精细操作请回看板。
      </p>
      <div class="gate-actions">
        <el-button type="primary" class="tap-btn" @click="enterPreview">预览仪式屏</el-button>
        <el-button class="tap-btn" @click="exit">回今日看板</el-button>
      </div>
    </div>
  </div>

  <div v-else class="ritual-shell" :class="{ 'is-immersive': isTv || gatePassed }">
    <header class="ritual-top">
      <div class="brand">
        <span class="brand-name">学迹</span>
        <span class="brand-sub">家庭仪式屏</span>
      </div>
      <div class="clock">{{ clockText }}</div>
      <el-button v-if="canFullscreen" class="tap-btn" text @click="toggleFullscreen">
        {{ isFullscreen ? '退出全屏' : '全屏' }}
      </el-button>
      <el-button class="tap-btn" text @click="exit">退出</el-button>
    </header>

    <main class="ritual-main" tabindex="0" @click="nextSlide" @keydown="onKey">
      <transition name="fade" mode="out-in">
        <section v-if="slide" :key="slide.key" class="slide">
          <p class="slide-kicker">{{ slide.kicker }}</p>
          <h1>{{ slide.title }}</h1>
          <p v-if="slide.body" class="slide-body">{{ slide.body }}</p>
          <p v-if="slide.line2" class="slide-body slide-line2">{{ slide.line2 }}</p>
        </section>
      </transition>
    </main>

    <footer class="ritual-foot muted">
      {{ slideIndex + 1 }} / {{ slides.length }} · 约 {{ rotateSec }} 秒换页 · 点击或空格可翻页
    </footer>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import http from '../../api/http'
import { friendlyError } from '../../composables/useOnboarding'
import { useBreakpoint } from '../../composables/useBreakpoint'

type Slide = {
  key: string
  kicker: string
  title: string
  body?: string
  /** 可选第二短句（最多两行，不用 bullet 列表） */
  line2?: string
}

const router = useRouter()
const { isTv, isPhone, isTablet } = useBreakpoint()
const needsGate = computed(() => isPhone.value || isTablet.value)
const gatePassed = ref(false)
const isFullscreen = ref(false)
const canFullscreen = computed(
  () => typeof document !== 'undefined' && !!document.documentElement?.requestFullscreen,
)

const slides = ref<Slide[]>([
  {
    key: 'welcome',
    kicker: '客厅仪式',
    title: '慢慢来，一起在变好',
    body: '看见努力就好。',
  },
])
const slideIndex = ref(0)
/** 略拉长间隔，远距扫读更稳 */
const rotateSec = 32
const now = ref(Date.now())
let rotateTimer: ReturnType<typeof setInterval> | undefined
let clockTimer: ReturnType<typeof setInterval> | undefined

const slide = computed(() => slides.value[slideIndex.value] || slides.value[0])

const clockText = computed(() => {
  void now.value
  const d = new Date()
  const w = ['日', '一', '二', '三', '四', '五', '六'][d.getDay()]
  return `${d.getMonth() + 1}月${d.getDate()}日 周${w} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
})

function nextSlide() {
  if (slides.value.length < 2) return
  slideIndex.value = (slideIndex.value + 1) % slides.value.length
}

function onKey(e: KeyboardEvent) {
  if (needsGate.value && !gatePassed.value) return
  if (e.code === 'Space' || e.key === 'ArrowRight') {
    e.preventDefault()
    nextSlide()
  } else if (e.key === 'ArrowLeft') {
    e.preventDefault()
    if (slides.value.length < 2) return
    slideIndex.value = (slideIndex.value - 1 + slides.value.length) % slides.value.length
  } else if (e.key === 'Escape') {
    exit()
  }
}

function enterPreview() {
  gatePassed.value = true
}

function exit() {
  if (document.fullscreenElement) {
    void document.exitFullscreen().catch(() => undefined)
  }
  router.push('/parent/monitor')
}

async function toggleFullscreen() {
  try {
    if (document.fullscreenElement) {
      await document.exitFullscreen()
      isFullscreen.value = false
    } else {
      await document.documentElement.requestFullscreen()
      isFullscreen.value = true
    }
  } catch {
    ElMessage.info('当前环境不支持全屏，可直接全屏浏览器窗口')
  }
}

function onFsChange() {
  isFullscreen.value = !!document.fullscreenElement
}

function buildSlides(
  monitor: any,
  reviews: Array<{ name: string; proud?: string; promise?: string }>,
  themes: Array<{ name: string; themeTitle: string; text?: string }> = [],
  themeHistory: Array<{
    name: string
    themeTitle: string
    weekKey: string
    text?: string
  }> = [],
) {
  const out: Slide[] = [
    {
      key: 'welcome',
      kicker: '客厅仪式',
      title: '慢慢来，一起在变好',
      body: '看见努力就好。',
    },
  ]
  for (const t of themes) {
    if (!t.themeTitle) continue
    out.push({
      key: `theme-${t.name}`,
      kicker: '本周主题',
      title: `${t.name} · ${t.themeTitle}`,
      body: t.text || '一起把主题练一点点。',
    })
  }
  for (const h of themeHistory) {
    if (!h.themeTitle) continue
    out.push({
      key: `theme-hist-${h.name}-${h.weekKey}`,
      kicker: '走过的主题',
      title: `${h.name} · ${h.themeTitle}`,
      body: h.text || `${h.weekKey} 留下的一页。`,
      line2: h.weekKey,
    })
  }
  for (const c of monitor?.children || []) {
    const done = c.done ?? c.stats?.done ?? 0
    const total = c.due ?? c.stats?.due ?? 0
    const pct = total ? Math.round((done / total) * 100) : 0
    const line =
      pct >= 100
        ? '今天收尾啦'
        : pct >= 50
          ? '节奏不错，继续就好'
          : '一件也算数'
    const wishTitle = c.nextWish?.title
    out.push({
      key: `child-${c.studentId}`,
      kicker: '今日节奏',
      title: `${c.name}`,
      body: `${done}/${total} · ${line}`,
      line2: wishTitle ? `靠近：${wishTitle}` : undefined,
    })
  }
  for (const r of reviews) {
    if (!r.proud && !r.promise) continue
    out.push({
      key: `weekend-${r.name}`,
      kicker: '周末小会',
      title: `${r.name}`,
      body: r.proud || undefined,
      line2: r.promise ? `陪伴：${r.promise}` : undefined,
    })
  }
  out.push({
    key: 'closing',
    kicker: '收尾',
    title: '下周见',
    body: '周末聊十分钟就够。',
  })
  return out
}

async function load() {
  try {
    const [monitor, batch, goals]: [any, any[], any[]] = await Promise.all([
      http.get('/dashboard/monitor?lite=1'),
      http.get('/students/weekend-reviews').catch(() => []),
      http.get('/students/weekly-goals').catch(() => []),
    ])
    const reviews: Array<{ name: string; proud?: string; promise?: string }> = (
      batch || []
    )
      .filter((r) => r?.proudText || r?.promiseText)
      .map((r) => ({
        name: r.name || '',
        proud: r.proudText || '',
        promise: r.promiseText || '',
      }))
    const themes = (goals || [])
      .filter((g) => g?.themeTitle)
      .map((g) => ({
        name: g.name || '',
        themeTitle: g.themeTitle || '',
        text: g.text || '',
      }))
    const themeHistory: Array<{
      name: string
      themeTitle: string
      weekKey: string
      text?: string
    }> = []
    for (const g of goals || []) {
      const name = g.name || ''
      for (const h of g.recentThemes || []) {
        if (!h?.themeTitle) continue
        themeHistory.push({
          name,
          themeTitle: h.themeTitle,
          weekKey: h.weekKey || '',
          text: h.text || '',
        })
      }
    }
    const built = buildSlides(monitor, reviews, themes, themeHistory.slice(0, 6))
    if (built.length) slides.value = built
  } catch (e: any) {
    ElMessage.warning(friendlyError(e, '仪式屏数据加载失败'))
  }
}

onMounted(() => {
  void load()
  rotateTimer = setInterval(nextSlide, rotateSec * 1000)
  clockTimer = setInterval(() => {
    now.value = Date.now()
  }, 30_000)
  document.addEventListener('fullscreenchange', onFsChange)
  window.addEventListener('keydown', onKey)
  // TV: 自动尝试全屏（失败则忽略）
  if (isTv.value) {
    void document.documentElement.requestFullscreen?.().catch(() => undefined)
  }
})

onUnmounted(() => {
  if (rotateTimer) clearInterval(rotateTimer)
  if (clockTimer) clearInterval(clockTimer)
  document.removeEventListener('fullscreenchange', onFsChange)
  window.removeEventListener('keydown', onKey)
})
</script>

<style scoped>
.ritual-gate {
  min-height: 70vh;
  display: grid;
  place-items: center;
  padding: calc(24px + env(safe-area-inset-top, 0px)) 16px
    calc(24px + env(safe-area-inset-bottom, 0px));
  background:
    radial-gradient(ellipse 90% 50% at 50% 0%, rgba(47, 111, 78, 0.18), transparent 55%),
    var(--bg, #eef3ef);
}
.gate-card {
  max-width: 440px;
  width: 100%;
}
.gate-brand {
  margin: 0 0 6px;
  font-family: var(--font-display);
  font-size: clamp(2.4rem, 8vw, 3.2rem);
  font-weight: 400;
  letter-spacing: 0.14em;
  color: var(--accent-strong, #1f4d36);
  line-height: 1.1;
}
.gate-kicker {
  margin: 0 0 8px;
  letter-spacing: 0.04em;
  font-size: 0.9rem;
}
.gate-title {
  font-family: var(--font-display);
  font-size: 1.35rem;
  margin: 0 0 12px;
  line-height: 1.35;
  color: var(--ink, #1c2b24);
  font-weight: 500;
}
.gate-body {
  margin: 0 0 20px;
  line-height: 1.55;
}
.gate-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}
.ritual-shell {
  min-height: 100vh;
  min-height: 100dvh;
  background: linear-gradient(165deg, #142820 0%, #1e3d32 45%, #0f1a15 100%);
  color: #f4f7f2;
  display: flex;
  flex-direction: column;
  padding: calc(20px + env(safe-area-inset-top, 0px)) 32px
    calc(16px + env(safe-area-inset-bottom, 0px));
}
.ritual-top {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}
.brand {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.brand-name {
  font-family: var(--font-display);
  font-size: clamp(1.45rem, 2.4vw, 1.85rem);
  font-weight: 400;
  letter-spacing: 0.12em;
  line-height: 1.15;
}
.brand-sub {
  font-size: 0.85rem;
  opacity: 0.72;
  font-weight: 500;
}
.clock {
  margin-left: auto;
  font-size: 1.1rem;
  opacity: 0.85;
}
.ritual-main {
  flex: 1;
  display: grid;
  place-items: center;
  padding: 24px 0;
  outline: none;
  cursor: pointer;
}
.slide {
  text-align: center;
  max-width: 960px;
  width: 100%;
}
.slide-kicker {
  letter-spacing: 0.06em;
  font-size: 1rem;
  opacity: 0.7;
  margin: 0 0 12px;
}
.slide h1 {
  font-family: var(--font-display);
  font-size: clamp(1.85rem, 4.5vw, 3.2rem);
  margin: 0 0 16px;
  line-height: 1.2;
  font-weight: 400;
}
.slide-body {
  font-size: clamp(1.1rem, 2.5vw, 1.6rem);
  line-height: 1.55;
  opacity: 0.92;
  margin: 0 auto 12px;
  max-width: 36em;
}
.slide-line2 {
  opacity: 0.78;
  font-size: clamp(1rem, 2.2vw, 1.35rem);
  margin-bottom: 0;
}
.ritual-foot {
  text-align: center;
  font-size: 0.95rem;
}
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.5s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
@media (min-width: 1600px) {
  .ritual-shell {
    padding: 40px 56px 28px;
  }
}
</style>
