<template>
  <div class="page">
    <PageSkeleton v-if="loading" :rows="5" />
    <template v-else>
      <div class="page-head">
        <div>
          <h2 class="page-title" style="margin: 0">{{ isParent ? '成长记录' : '我的成长' }}</h2>
          <p class="muted lead">时间轴记里程碑，相册留瞬间，作品集看见自己的故事</p>
        </div>
        <div class="page-head-actions">
          <el-select
            v-if="isParent && students.length > 1"
            v-model="studentId"
            size="large"
            style="min-width: 140px"
            @change="reload"
          >
            <el-option v-for="s in students" :key="s.id" :label="s.name" :value="s.id" />
          </el-select>
          <el-button
            v-if="isParent && students.length"
            type="primary"
            class="tap-btn"
            @click="openManualDrawer"
          >
            记一笔
          </el-button>
        </div>
      </div>

      <el-tabs v-model="tab" class="growth-tabs">
        <el-tab-pane label="作品集" name="portfolio">
          <div v-if="portfolio.weekTheme" class="card-panel theme-banner">
            <strong>本周主题 · {{ portfolio.weekTheme.themeTitle || '自定义' }}</strong>
            <p v-if="portfolio.weekTheme.text" class="muted tiny" style="margin: 6px 0 0">
              {{ portfolio.weekTheme.text }}
            </p>
          </div>
          <p class="muted tiny" style="margin: 0 0 12px">
            想让家人也看见一件小事？
            <el-button text type="primary" class="tap-btn" @click="goJournal">
              去{{ journalName }} ›
            </el-button>
          </p>
          <div
            v-if="themeFilterOptions.length"
            class="theme-filter"
            style="margin-bottom: 12px"
          >
            <h3 class="month-title">按主题周看</h3>
            <div class="theme-chips">
              <button
                type="button"
                class="theme-chip"
                :class="{ on: !filterWeekKey }"
                @click="filterWeekKey = ''"
              >
                全部
              </button>
              <button
                v-for="opt in themeFilterOptions"
                :key="opt.weekKey"
                type="button"
                class="theme-chip"
                :class="{ on: filterWeekKey === opt.weekKey }"
                @click="filterWeekKey = opt.weekKey"
              >
                {{ opt.label }}
              </button>
            </div>
            <p v-if="filterWeekKey && filterRange" class="muted tiny" style="margin: 8px 0 0">
              {{ filterRange.from }} ～ {{ filterRange.to }}
            </p>
          </div>
          <p class="muted tiny portfolio-stats">
            照片 {{ filteredPhotos.length }} · 里程碑
            {{ filteredMilestones.length }} · 想法
            {{ filteredReflections.length }}
            <template v-if="!filterWeekKey">
              （近窗合计 {{ portfolio.stats.photoCount }} /
              {{ portfolio.stats.milestoneCount }} /
              {{ portfolio.stats.reflectionCount }}）
            </template>
          </p>
          <div v-if="filteredPhotos.length" class="album-grid" style="margin-bottom: 16px">
            <div v-for="item in filteredPhotos" :key="'p' + item.id" class="album-item">
              <img :src="item.imageUrl" :alt="item.title" loading="lazy" />
              <div class="album-cap">
                <span>{{ item.title }}</span>
                <span class="muted tiny">{{ item.date }}</span>
              </div>
            </div>
          </div>
          <div v-if="filteredReflections.length" class="reflect-list">
            <h3 class="month-title">近期想法</h3>
            <div
              v-for="r in filteredReflections"
              :key="'r' + r.id"
              class="card-panel reflect-row"
            >
              <strong>{{ r.title }}</strong>
              <p v-if="r.text" class="muted tiny" style="margin: 4px 0 0">{{ r.text }}</p>
              <p class="muted tiny" style="margin: 4px 0 0">{{ r.date }}</p>
            </div>
          </div>
          <div v-if="filteredMilestones.length" class="ms-preview">
            <h3 class="month-title">里程碑摘录</h3>
            <div
              v-for="m in filteredMilestones.slice(0, 8)"
              :key="'m' + m.id"
              class="card-panel timeline-row"
            >
              <div class="timeline-dot" :class="m.kind" />
              <div>
                <strong>{{ m.title }}</strong>
                <p class="muted tiny" style="margin: 4px 0 0">{{ formatDate(m.occurredAt) }}</p>
              </div>
            </div>
          </div>
          <EmptyState
            v-if="
              !filteredPhotos.length &&
              !filteredMilestones.length &&
              !filteredReflections.length
            "
            title="作品集还是空的"
            :description="
              filterWeekKey
                ? '这一周还没有留下照片、想法或里程碑。'
                : '打卡时选一张照片，或写下心情/反思，就会出现在这里。'
            "
          />
        </el-tab-pane>

        <el-tab-pane label="成长时间轴" name="timeline">
          <div v-if="milestones.length" class="timeline">
            <div v-for="m in milestones" :key="m.id" class="card-panel timeline-row">
              <div class="timeline-dot" :class="m.kind" />
              <div>
                <strong>{{ m.title }}</strong>
                <p v-if="m.note" class="muted tiny" style="margin: 4px 0 0">{{ m.note }}</p>
                <p class="muted tiny" style="margin: 4px 0 0">
                  {{ formatDate(m.occurredAt) }}
                  <span v-if="m.kind === 'auto'"> · 自动记录</span>
                </p>
              </div>
            </div>
          </div>
          <EmptyState
            v-else
            title="还没有里程碑"
            description="习惯最近 7 天完成 5 次会自动记一笔；家长也可以手动添加。"
            :action-label="isParent && students.length ? '记一笔' : ''"
            @action="openManualDrawer"
          />
        </el-tab-pane>

        <el-tab-pane label="打卡相册" name="album">
          <p class="muted tiny album-hint">近 90 天有照片的打卡，按月分组。</p>
          <div v-for="group in album" :key="group.month" class="album-month">
            <h3 class="month-title">{{ group.month }}</h3>
            <div class="album-grid">
              <div v-for="item in group.items" :key="item.id" class="album-item">
                <img :src="item.imageUrl" :alt="item.title" loading="lazy" />
                <div class="album-cap">
                  <span>{{ item.title }}</span>
                  <span class="muted tiny">{{ item.date }}</span>
                </div>
              </div>
            </div>
          </div>
          <EmptyState
            v-if="!album.length"
            title="相册还是空的"
            description="打卡时选一张照片，就会出现在这里。"
          />
        </el-tab-pane>
      </el-tabs>

      <el-drawer
        v-if="isParent"
        v-model="manualDrawer"
        title="手动记一笔"
        :direction="isPhone ? 'btt' : 'rtl'"
        :size="isPhone ? 'var(--drawer-phone)' : '400px'"
        destroy-on-close
      >
        <el-input
          v-model="manualTitle"
          maxlength="120"
          show-word-limit
          size="large"
          placeholder="例如：第一次自己整理书包一周"
          style="margin-bottom: 8px"
        />
        <el-input
          v-model="manualNote"
          type="textarea"
          :rows="3"
          maxlength="200"
          show-word-limit
          size="large"
          placeholder="可选：一句补充"
        />
        <el-button
          type="primary"
          class="tap-btn"
          :loading="adding"
          :disabled="!manualTitle.trim()"
          style="margin-top: 14px; width: 100%"
          @click="addMilestone"
        >
          添加到时间轴
        </el-button>
      </el-drawer>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import http from '../../api/http'
import { useAuthStore } from '../../stores/auth'
import { friendlyError } from '../../composables/useOnboarding'
import { useBreakpoint } from '../../composables/useBreakpoint'
import { journalProductName } from '../../composables/journalLabels'
import PageSkeleton from '../../components/PageSkeleton.vue'
import EmptyState from '../../components/EmptyState.vue'
import {
  rangeForIsoWeekKey,
} from '../../composables/themeWeek'
import {
  buildThemeFilterOptions,
  itemsInWeekKey,
} from '../../composables/portfolioWeekFilter'

type Milestone = {
  id: number
  title: string
  note?: string | null
  kind: string
  occurredAt: string
}

type AlbumGroup = {
  month: string
  items: Array<{ id: number; imageUrl: string; title: string; date: string }>
}

type Portfolio = {
  weekTheme: {
    themeTitle: string
    themePreset: string
    text: string
    weekKey: string
  } | null
  themeHistory: Array<{
    weekKey: string
    themeTitle: string
    themePreset: string
    text: string
  }>
  milestones: Milestone[]
  photos: Array<{ id: number; imageUrl: string; title: string; date: string }>
  reflections: Array<{
    id: number
    title: string
    text: string
    moodTag: string | null
    date: string
  }>
  stats: {
    photoCount: number
    milestoneCount: number
    reflectionCount: number
  }
}

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()
const { isPhone } = useBreakpoint()
const isParent = computed(() => auth.user?.role === 'parent')
const journalName = computed(() =>
  journalProductName(isParent.value ? 'general' : localStorage.getItem('ageBand') || 'general'),
)

function goJournal() {
  router.push(isParent.value ? '/parent/journal' : '/student/journal')
}
const loading = ref(true)
const tab = ref(
  route.query.tab === 'portfolio' || route.query.tab === 'album'
    ? String(route.query.tab)
    : 'portfolio',
)
const students = ref<Array<{ id: number; name: string }>>([])
const studentId = ref(0)
const milestones = ref<Milestone[]>([])
const album = ref<AlbumGroup[]>([])
const portfolio = ref<Portfolio>({
  weekTheme: null,
  themeHistory: [],
  milestones: [],
  photos: [],
  reflections: [],
  stats: { photoCount: 0, milestoneCount: 0, reflectionCount: 0 },
})
const manualDrawer = ref(false)
const manualTitle = ref('')
const manualNote = ref('')
const adding = ref(false)
/** P4.1：按主题周过滤作品集内容 */
const filterWeekKey = ref('')

const themeFilterOptions = computed(() =>
  buildThemeFilterOptions(
    portfolio.value.weekTheme,
    portfolio.value.themeHistory || [],
  ),
)

const filterRange = computed(() =>
  filterWeekKey.value ? rangeForIsoWeekKey(filterWeekKey.value) : null,
)

const filteredPhotos = computed(() =>
  itemsInWeekKey(
    portfolio.value.photos,
    filterWeekKey.value,
    (p) => p.date,
  ),
)
const filteredReflections = computed(() =>
  itemsInWeekKey(
    portfolio.value.reflections,
    filterWeekKey.value,
    (r) => r.date,
  ),
)
const filteredMilestones = computed(() =>
  itemsInWeekKey(
    portfolio.value.milestones,
    filterWeekKey.value,
    (m) => m.occurredAt,
  ),
)

function openManualDrawer() {
  if (isParent.value && !studentId.value) {
    ElMessage.warning('请先添加孩子，再记成长')
    return
  }
  manualDrawer.value = true
}

function formatDate(iso: string) {
  if (!iso) return ''
  return iso.slice(0, 10)
}

async function loadStudents() {
  if (!isParent.value) return
  try {
    students.value = (await http.get('/students')) as any[]
    const qSid = Number(route.query.studentId)
    if (qSid && students.value.some((s) => s.id === qSid)) {
      studentId.value = qSid
    } else if (students.value.length && !studentId.value) {
      studentId.value = students.value[0].id
    }
  } catch {
    students.value = []
  }
}

async function loadMilestones() {
  const q = isParent.value && studentId.value ? `?studentId=${studentId.value}` : ''
  milestones.value = (await http.get(`/growth/milestones${q}`)) as Milestone[]
}

async function loadAlbum() {
  const q = isParent.value && studentId.value ? `?studentId=${studentId.value}` : ''
  album.value = (await http.get(`/growth/album${q}`)) as AlbumGroup[]
}

async function loadPortfolio() {
  const q = isParent.value && studentId.value ? `?studentId=${studentId.value}` : ''
  const raw = (await http.get(`/growth/portfolio${q}`)) as Portfolio
  portfolio.value = {
    ...raw,
    themeHistory: raw.themeHistory || [],
    photos: raw.photos || [],
    reflections: raw.reflections || [],
    milestones: raw.milestones || [],
    stats: raw.stats || {
      photoCount: 0,
      milestoneCount: 0,
      reflectionCount: 0,
    },
  }
  filterWeekKey.value = ''
}

async function reload() {
  loading.value = true
  try {
    await Promise.all([loadMilestones(), loadAlbum(), loadPortfolio()])
  } catch (e: any) {
    ElMessage.error(friendlyError(e, '成长记录暂时打不开'))
  } finally {
    loading.value = false
  }
}

async function addMilestone() {
  if (!manualTitle.trim() || adding.value) return
  adding.value = true
  try {
    await http.post('/growth/milestones', {
      studentId: studentId.value,
      title: manualTitle.trim(),
      note: manualNote.trim() || undefined,
    })
    manualTitle.value = ''
    manualNote.value = ''
    manualDrawer.value = false
    await loadMilestones()
    ElMessage.success('已添加到时间轴')
  } catch (e: any) {
    ElMessage.error(friendlyError(e, '添加没成功'))
  } finally {
    adding.value = false
  }
}

onMounted(async () => {
  if (isParent.value) await loadStudents()
  await reload()
})
</script>

<style scoped>
.lead {
  margin: 4px 0 0;
}
.page-head-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.growth-tabs {
  margin-top: 8px;
}
.timeline-row {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  margin-bottom: 10px;
  position: relative;
}
.timeline-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  margin-top: 6px;
  flex-shrink: 0;
  background: var(--accent, #3d8b6e);
}
.timeline-dot.manual {
  background: #6b8fd4;
}
.album-hint {
  margin: 0 0 12px;
}
.month-title {
  margin: 16px 0 10px;
  font-size: 1rem;
}
.album-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 10px;
}
.album-item {
  border: 1px solid var(--line, #e5e5e5);
  border-radius: 10px;
  overflow: hidden;
  background: #fff;
}
.album-item img {
  width: 100%;
  aspect-ratio: 1;
  object-fit: cover;
  display: block;
}
.album-cap {
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 0.85rem;
}
.theme-banner {
  margin-bottom: 12px;
}
.theme-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.theme-chip {
  border: 1px solid var(--line, #d8e0d6);
  background: #fff;
  border-radius: 999px;
  padding: 8px 12px;
  min-height: var(--tap-min, 44px);
  cursor: pointer;
  font: inherit;
}
.theme-chip.on {
  border-color: var(--accent-strong, #2d6b52);
  background: #eef6f1;
}
.portfolio-stats {
  margin: 0 0 12px;
}
.reflect-row {
  margin-bottom: 8px;
}
</style>
