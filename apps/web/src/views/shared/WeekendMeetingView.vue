<template>
  <div class="page">
    <PageSkeleton v-if="loading" :rows="4" />
    <template v-else>
      <div class="page-head">
        <div>
          <h2 class="page-title" style="margin: 0">周末小会</h2>
          <p class="muted lead">三步小仪式：骄傲 · 改一件 · 陪伴承诺</p>
        </div>
        <el-select
          v-if="isParent && students.length > 1"
          v-model="studentId"
          size="large"
          style="min-width: 140px"
          @change="onStudentChange"
        >
          <el-option v-for="s in students" :key="s.id" :label="s.name" :value="s.id" />
        </el-select>
      </div>

      <EmptyState
        v-if="isParent && !students.length"
        hero
        title="还没有孩子"
        description="先添加孩子，再一起开周末小会。"
        action-label="去学生管理"
        @action="$router.push('/parent/students')"
      />

      <template v-else>
      <div v-if="weekendHint" class="card-panel weekend-hint" role="status">
        {{ weekendHint }}
      </div>

      <div v-if="weekThemeLine" class="card-panel theme-banner" role="status">
        <div class="theme-banner-head">
          <strong>{{ weekThemeLine }}</strong>
          <el-button text type="primary" class="tap-btn" @click="themeDrawer = true">
            去改
          </el-button>
        </div>
        <p v-if="weekThemeText" class="muted tiny" style="margin: 6px 0 0">
          {{ weekThemeText }}
        </p>
        <p v-else class="muted tiny" style="margin: 6px 0 0">
          收尾时一起看看：主题有没有一点点进步。
        </p>
        <el-button
          text
          type="primary"
          class="tap-btn"
          style="margin-top: 4px; padding-left: 0"
          @click="goPortfolio"
        >
          去看成长作品集 ›
        </el-button>
      </div>
      <div
        v-else-if="!loading"
        class="card-panel theme-banner soft"
        role="status"
      >
        <div class="theme-banner-head">
          <span class="muted">这周还没定主题。</span>
          <el-button text type="primary" class="tap-btn" @click="themeDrawer = true">
            一起定
          </el-button>
        </div>
      </div>

      <ThemeWeekDrawer
        v-model="themeDrawer"
        :student-id="isParent ? studentId : undefined"
        :theme-preset="weekThemePreset"
        :theme-title="weekThemeTitle"
        :text="weekThemeText"
        @saved="onThemeSaved"
        @suggest="onThemeSuggest"
      />

      <div class="wizard-progress" aria-label="小会进度">
        <button
          v-for="i in 3"
          :key="i"
          type="button"
          class="progress-dot"
          :class="{ active: wizardStep === i - 1, done: wizardStep > i - 1 }"
          :aria-current="wizardStep === i - 1 ? 'step' : undefined"
          :aria-label="`第 ${i} 步`"
          @click="wizardStep = (i - 1) as 0 | 1 | 2"
        />
        <span class="muted tiny progress-label">{{ wizardStep + 1 }}/3</span>
      </div>

      <div v-show="wizardStep === 0" class="card-panel step-card">
        <div class="step-num">1</div>
        <h3>本周我最骄傲的一件事</h3>
        <p class="muted tiny">可以是小事：坚持、帮助家人、克服难点。</p>
        <el-input
          v-model="form.proudText"
          type="textarea"
          :rows="3"
          maxlength="120"
          show-word-limit
          size="large"
          placeholder="例如：这周阅读我坚持到了第五天"
        />
        <div v-if="journalPicks.length" class="theme-chips" style="margin-top: 10px">
          <span class="muted tiny" style="width: 100%">可选：引用一条{{ journalName }}</span>
          <button
            v-for="p in journalPicks"
            :key="p.id"
            type="button"
            class="theme-chip"
            :class="{ on: form.journalPostId === p.id }"
            @click="citeJournal(p)"
          >
            {{ (p.body || '（附图）').slice(0, 18) }}{{ (p.body || '').length > 18 ? '…' : '' }}
          </button>
          <button
            v-if="form.journalPostId"
            type="button"
            class="theme-chip"
            @click="clearJournalCite"
          >
            取消引用
          </button>
        </div>
        <p v-if="citedSummary" class="muted tiny" style="margin-top: 8px">
          已引用：{{ citedSummary }}
          <span v-if="citeGone"> · 原帖已删，摘要仍保留</span>
          <el-button
            v-if="form.journalPostId && !citeGone"
            text
            type="primary"
            class="tap-btn"
            @click="goCitedJournal"
          >
            去看看 ›
          </el-button>
        </p>
      </div>

      <div v-show="wizardStep === 1" class="card-panel step-card">
        <div class="step-num">2</div>
        <h3>下周我想改一件小事</h3>
        <p class="muted tiny">只选一件，比列清单更容易做到。</p>
        <div v-if="changeSuggests.length" class="theme-chips" style="margin-bottom: 10px">
          <button
            v-for="s in changeSuggests"
            :key="s"
            type="button"
            class="theme-chip"
            @click="form.changeText = s"
          >
            {{ s }}
          </button>
        </div>
        <el-input
          v-model="form.changeText"
          type="textarea"
          :rows="3"
          maxlength="120"
          show-word-limit
          size="large"
          placeholder="例如：先把书包整理好再开始作业"
        />
      </div>

      <div v-show="wizardStep === 2" class="card-panel step-card">
        <div class="step-num">3</div>
        <h3>{{ isParent ? '我的陪伴承诺' : '希望家长怎样陪我' }}</h3>
        <p class="muted tiny">说具体、可执行的话，比「加油」更有用。</p>
        <el-input
          v-model="form.promiseText"
          type="textarea"
          :rows="3"
          maxlength="120"
          show-word-limit
          size="large"
          :placeholder="
            isParent
              ? '例如：周日晚上一起复盘 10 分钟，不催分'
              : '例如：希望先听我说完再提建议'
          "
        />
      </div>

      <div class="wizard-nav">
        <el-button
          v-if="wizardStep > 0"
          class="tap-btn"
          size="large"
          @click="wizardStep = (wizardStep - 1) as 0 | 1 | 2"
        >
          上一步
        </el-button>
        <el-button
          v-if="wizardStep < 2"
          type="primary"
          class="tap-btn"
          size="large"
          @click="wizardStep = (wizardStep + 1) as 0 | 1 | 2"
        >
          下一步
        </el-button>
        <el-button
          v-else
          type="primary"
          class="tap-btn"
          size="large"
          :loading="saving"
          @click="save"
        >
          保存
        </el-button>
      </div>
      </template>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import http from '../../api/http'
import { useAuthStore } from '../../stores/auth'
import { friendlyError } from '../../composables/useOnboarding'
import PageSkeleton from '../../components/PageSkeleton.vue'
import EmptyState from '../../components/EmptyState.vue'
import ThemeWeekDrawer from '../../components/ThemeWeekDrawer.vue'
import { useRouter } from 'vue-router'
import { suggestionsForThemePreset } from '../../composables/themeWeek'
import { journalProductName } from '../../composables/journalLabels'

const router = useRouter()
const auth = useAuthStore()
const isParent = computed(() => auth.user?.role === 'parent')
const ageBand = ref(localStorage.getItem('ageBand') || 'general')
const journalName = computed(() =>
  journalProductName(isParent.value ? 'general' : ageBand.value),
)
const loading = ref(true)
const saving = ref(false)
const students = ref<Array<{ id: number; name: string }>>([])
const studentId = ref(0)
const wizardStep = ref<0 | 1 | 2>(0)
const form = reactive({
  proudText: '',
  changeText: '',
  promiseText: '',
  journalPostId: null as number | null,
  journalPostSummary: null as string | null,
})
const journalPicks = ref<any[]>([])
const weekThemeTitle = ref('')
const weekThemeText = ref('')
const weekThemePreset = ref('')
const themeDrawer = ref(false)
const citeGone = ref(false)

const citedSummary = computed(() => {
  if (!form.journalPostId && !form.journalPostSummary) return ''
  if (form.journalPostSummary) return form.journalPostSummary
  const p = journalPicks.value.find((x) => x.id === form.journalPostId)
  if (!p) return form.journalPostId ? `说说 #${form.journalPostId}` : ''
  return (p.body || '（附图）').slice(0, 40)
})

const weekendHint = computed(() => {
  const d = new Date().getDay()
  if (d === 6 || d === 0) return '周末适合坐下来聊 10 分钟，不必像复盘 KPI。'
  return ''
})

const weekThemeLine = computed(() => {
  if (!weekThemeTitle.value) return ''
  return `本周主题 · ${weekThemeTitle.value}`
})

const changeSuggests = computed(() =>
  suggestionsForThemePreset(weekThemePreset.value).slice(0, 3),
)

function goPortfolio() {
  const base = isParent.value ? '/parent/growth' : '/student/growth'
  const q = isParent.value && studentId.value
    ? `?tab=portfolio&studentId=${studentId.value}`
    : '?tab=portfolio'
  router.push(base + q)
}

function citeJournal(p: any) {
  form.journalPostId = p.id
  form.journalPostSummary = (p.body || '（附图）').slice(0, 120)
  citeGone.value = false
  if (!form.proudText.trim()) {
    form.proudText = form.journalPostSummary
  }
}

function clearJournalCite() {
  form.journalPostId = null
  form.journalPostSummary = null
  citeGone.value = false
}

function goCitedJournal() {
  if (!form.journalPostId || citeGone.value) return
  const base = isParent.value ? '/parent/journal' : '/student/journal'
  router.push({ path: base, query: { postId: String(form.journalPostId) } })
}

async function probeCitedPost() {
  citeGone.value = false
  if (!form.journalPostId) return
  if (journalPicks.value.some((p) => p.id === form.journalPostId)) return
  try {
    await http.get(`/journal/posts/${form.journalPostId}`)
  } catch {
    citeGone.value = true
  }
}

async function loadJournalPicks() {
  try {
    const list = (await http.get('/journal/posts?limit=8')) as any[]
    journalPicks.value = Array.isArray(list) ? list : []
  } catch {
    journalPicks.value = []
  }
}

function onThemeSaved(s: {
  themePreset: string
  themeTitle: string
  text: string
}) {
  weekThemePreset.value = s.themePreset
  weekThemeTitle.value = s.themeTitle
  weekThemeText.value = s.text
}

function onThemeSuggest(title: string) {
  if (!isParent.value) {
    ElMessage.info('可以请家长在任务清单里布置这件小事')
    return
  }
  themeDrawer.value = false
  router.push({
    path: '/parent/tasks',
    query: {
      suggestTitle: title,
      suggestMicro: '1',
      ...(studentId.value ? { studentId: String(studentId.value) } : {}),
    },
  })
}

async function loadStudents() {
  if (!isParent.value) return
  try {
    students.value = (await http.get('/students')) as any[]
    if (students.value.length && !studentId.value) {
      studentId.value = students.value[0].id
    }
  } catch {
    students.value = []
  }
}

async function loadTheme() {
  weekThemeTitle.value = ''
  weekThemeText.value = ''
  try {
    if (isParent.value && !studentId.value) return
    const url = isParent.value
      ? `/students/${studentId.value}/weekly-goal`
      : '/my/weekly-goal'
    const g: any = await http.get(url)
    weekThemeTitle.value = (g.themeTitle || '').trim()
    weekThemeText.value = (g.text || '').trim()
    weekThemePreset.value = g.themePreset || ''
  } catch {
    /* 主题只读，失败不挡小会 */
  }
}

async function load() {
  loading.value = true
  try {
    if (isParent.value && !studentId.value) {
      form.proudText = ''
      form.changeText = ''
      form.promiseText = ''
      form.journalPostId = null
      form.journalPostSummary = null
      citeGone.value = false
      weekThemeTitle.value = ''
      weekThemeText.value = ''
      return
    }
    const url = isParent.value
      ? `/students/${studentId.value}/weekend-review`
      : '/my/weekend-review'
    const [res] = await Promise.all([
      http.get(url) as Promise<any>,
      loadTheme(),
      loadJournalPicks(),
    ])
    form.proudText = res.proudText || ''
    form.changeText = res.changeText || ''
    form.promiseText = res.promiseText || ''
    form.journalPostId = res.journalPostId ?? null
    form.journalPostSummary = res.journalPostSummary || null
    await probeCitedPost()
  } catch (e: any) {
    ElMessage.error(friendlyError(e, '小会记录暂时打不开'))
  } finally {
    loading.value = false
  }
}

function onStudentChange() {
  wizardStep.value = 0
  void load()
}

async function save() {
  if (saving.value) return
  saving.value = true
  try {
    const body = {
      proudText: form.proudText.trim() || undefined,
      changeText: form.changeText.trim() || undefined,
      promiseText: form.promiseText.trim() || undefined,
      journalPostId: form.journalPostId,
      journalPostSummary: form.journalPostSummary,
    }
    const url = isParent.value
      ? `/students/${studentId.value}/weekend-review`
      : '/my/weekend-review'
    await http.put(url, body)
    ElMessage.success('已保存，换设备也能看到')
  } catch (e: any) {
    ElMessage.error(friendlyError(e, '保存没成功'))
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  if (isParent.value) await loadStudents()
  await load()
})
</script>

<style scoped>
.lead {
  margin: 4px 0 0;
}
.weekend-hint {
  border-color: rgba(100, 80, 160, 0.22);
  background: linear-gradient(160deg, #f8f5ff 0%, #fff 85%);
  margin-bottom: 14px;
}
.theme-banner {
  margin-bottom: 14px;
  border-color: color-mix(in srgb, var(--accent, #3d8b6e) 28%, var(--line));
}
.theme-banner.soft {
  background: color-mix(in srgb, var(--accent, #3d8b6e) 6%, #fff);
}
.theme-banner-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.wizard-progress {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 14px;
}
.progress-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  border: 1px solid var(--line);
  background: #fff;
  padding: 0;
  cursor: pointer;
}
.progress-dot.active {
  background: var(--accent-strong, #2d6b52);
  border-color: var(--accent-strong, #2d6b52);
  transform: scale(1.15);
}
.progress-dot.done {
  background: var(--accent-soft, #eef6f1);
  border-color: var(--accent, #3d8b6e);
}
.progress-label {
  margin-left: 4px;
}
.tiny {
  font-size: 0.88rem;
}
.step-card {
  margin-bottom: 14px;
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
  text-align: left;
}
.theme-chip.on {
  border-color: var(--brand, #3d6b4f);
  background: color-mix(in srgb, var(--brand, #3d6b4f) 12%, #fff);
}
.step-num {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--accent-soft, #eef6f1);
  color: var(--accent-strong, #2d6b52);
  font-weight: 700;
  font-size: 0.9rem;
  margin-bottom: 8px;
}
.step-card h3 {
  margin: 0 0 6px;
  font-family: var(--font-display);
}
.wizard-nav {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 4px;
}
.wizard-nav .tap-btn {
  flex: 1 1 120px;
}
</style>
