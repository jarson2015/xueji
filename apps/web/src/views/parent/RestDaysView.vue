<template>
  <div class="page">
    <div class="page-head">
      <h2 class="page-title" style="margin: 0">休息约定</h2>
      <div class="page-head-actions">
        <el-button text type="primary" @click="$router.push('/parent/family-edu')">
          教育设置
        </el-button>
        <el-button text type="primary" @click="$router.push('/parent/covenant')">
          预览公约
        </el-button>
      </div>
    </div>

    <div class="card-panel">
      <p class="lead">
        休息日是家庭主动打开的「今天不催」约定，不会把任务从清单里删掉；关掉后，今日列表会自然恢复。
      </p>
      <div class="makeup-row">
        <span>启用休息日约定</span>
        <el-switch v-model="restDaysEnabled" size="large" />
      </div>
      <template v-if="restDaysEnabled">
        <h3>每周固定休息</h3>
        <el-checkbox-group v-model="weekly" class="week-group">
          <el-checkbox
            v-for="d in weekOptions"
            :key="d.value"
            :value="d.value"
            class="week-item"
          >
            {{ d.label }}
          </el-checkbox>
        </el-checkbox-group>

        <h3 style="margin-top: 20px">休息日暂停哪些</h3>
        <p class="lead muted">
          可一键选预设，或自定义。一次性任务在非「全部暂停」时仍会显示。
        </p>
        <el-radio-group v-model="restPreset" size="large" @change="applyRestPreset">
          <el-radio-button value="study">仅学业</el-radio-button>
          <el-radio-button value="study_chore">学业+家务</el-radio-button>
          <el-radio-button value="all_cats">三类循环</el-radio-button>
          <el-radio-button value="pause_all">全部暂停</el-radio-button>
          <el-radio-button value="custom">自定义</el-radio-button>
        </el-radio-group>
        <p v-if="restPreset === 'pause_all'" class="muted tiny-hint warn-hint">
          「全部暂停」适合生病、出游或明确家庭日，不宜作为每个周末的默认。
        </p>
        <div class="makeup-row" v-if="restPreset === 'custom' || restPreset === 'pause_all'">
          <span>暂停全部任务</span>
          <el-switch v-model="restPauseAll" size="large" @change="onPauseAllChange" />
        </div>
        <el-checkbox-group
          v-if="!restPauseAll && restPreset === 'custom'"
          v-model="restPauseCategories"
          class="week-group"
        >
          <el-checkbox value="study" class="week-item">学习</el-checkbox>
          <el-checkbox value="chore" class="week-item">家务</el-checkbox>
          <el-checkbox value="routine" class="week-item">习惯</el-checkbox>
        </el-checkbox-group>
        <p
          v-if="!restPauseAll && restPreset === 'custom' && !restPauseCategories.length"
          class="muted tiny-hint"
        >
          请至少勾选一类，或打开「暂停全部任务」。
        </p>
      </template>
      <p v-else class="muted tiny-hint">未启用时，每周与额外休息日不会生效。</p>
    </div>

    <el-collapse class="advanced-fold">
      <el-collapse-item name="rest-extra">
        <template #title>
          <span>进阶：休息例外</span>
        </template>

        <div v-if="restDaysEnabled" class="fold-section">
          <h3>额外休息日</h3>
          <div class="extra-row">
            <el-date-picker
              v-model="extraPick"
              type="date"
              value-format="YYYY-MM-DD"
              placeholder="选一天"
              size="large"
              style="flex: 1"
            />
            <el-button class="tap-btn" type="primary" @click="addExtra">加上</el-button>
          </div>
          <div v-if="extras.length" class="extra-list">
            <el-tag
              v-for="d in extras"
              :key="d"
              closable
              size="large"
              class="extra-tag"
              @close="removeExtra(d)"
            >
              {{ d }}
            </el-tag>
          </div>
          <div v-else class="muted">还没有额外休息日</div>
        </div>
        <p v-else class="muted tiny-hint fold-section">启用休息日后，可在这里添加额外休息日。</p>

        <div class="fold-section">
          <h3>补上进度</h3>
          <p class="lead muted">
            过了约定时间或漏掉的任务，可以申请补上进度；通过后发放部分积分（不扣已有分）。适合生病、外出等特殊收尾，不是日常替代准时完成。
          </p>
          <div class="makeup-row">
            <span>允许补上进度</span>
            <el-switch v-model="makeupEnabled" size="large" />
          </div>
          <p v-if="!makeupEnabled" class="muted tiny-hint warn-hint" style="margin-top: 8px">
            已关闭补上进度：过了当天（或本周）还没做完的，会从「今日催促」里轻轻放下，明天重新开始；不会扣分、也不删记录。休息日未完成、以及还在等家长确认的，不会被收走。
          </p>
          <div class="makeup-row" v-if="makeupEnabled">
            <span>积分比例</span>
            <el-input-number
              v-model="makeupDiscount"
              :min="10"
              :max="100"
              :step="10"
              size="large"
            />
            <span class="muted">%</span>
          </div>
          <p v-if="makeupEnabled" class="muted tiny-hint">
            默认约一半积分：鼓励准时完成，又给特殊情况留出口。
          </p>
          <div class="makeup-row" v-if="makeupEnabled">
            <span>可补最近天数</span>
            <el-input-number v-model="makeupWindow" :min="1" :max="30" size="large" />
          </div>
        </div>
      </el-collapse-item>
    </el-collapse>

    <el-button
      type="primary"
      class="tap-btn full-tap"
      :loading="saving"
      @click="save"
    >
      保存约定
    </el-button>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import http from '../../api/http'
import { friendlyError } from '../../composables/useOnboarding'
import {
  applySettingsFlags,
  useFeatureFlags,
} from '../../composables/useFeatureFlags'
import { bumpTaskSync } from '../../composables/taskSync'
import { settingsToPutPayload } from '../../composables/familySettingsIo'

const { refresh: refreshFlags } = useFeatureFlags()

const settingsSnapshot = ref<Record<string, any>>({})
const weekly = ref<number[]>([])
const extras = ref<string[]>([])
const extraPick = ref('')
const saving = ref(false)
const restDaysEnabled = ref(false)
const restPauseAll = ref(false)
const restPauseCategories = ref<string[]>(['study'])
const restPreset = ref('study')
const makeupEnabled = ref(true)
const makeupDiscount = ref(50)
const makeupWindow = ref(7)

const weekOptions = [
  { value: 0, label: '周日' },
  { value: 1, label: '周一' },
  { value: 2, label: '周二' },
  { value: 3, label: '周三' },
  { value: 4, label: '周四' },
  { value: 5, label: '周五' },
  { value: 6, label: '周六' },
]

function detectPreset(pauseAll: boolean, cats: string[]) {
  if (pauseAll) return 'pause_all'
  const s = [...cats].sort().join(',')
  if (s === 'study') return 'study'
  if (s === 'chore,study') return 'study_chore'
  if (s === 'chore,routine,study') return 'all_cats'
  return 'custom'
}

function applyRestPreset(v: string | number | boolean | undefined) {
  const key = String(v || restPreset.value)
  if (key === 'study') {
    restPauseAll.value = false
    restPauseCategories.value = ['study']
  } else if (key === 'study_chore') {
    restPauseAll.value = false
    restPauseCategories.value = ['study', 'chore']
  } else if (key === 'all_cats') {
    restPauseAll.value = false
    restPauseCategories.value = ['study', 'chore', 'routine']
  } else if (key === 'pause_all') {
    restPauseAll.value = true
  }
}

function onPauseAllChange(v: string | number | boolean) {
  if (v) restPreset.value = 'pause_all'
  else if (restPreset.value === 'pause_all') restPreset.value = 'custom'
}

function hydrateFromRes(res: any) {
  weekly.value = res.weeklyRestDays || []
  extras.value = res.extraRestDates || []
  restDaysEnabled.value = !!res.restDaysEnabled
  restPauseAll.value = !!res.restPauseAll
  restPauseCategories.value = res.restPauseCategories?.length
    ? [...res.restPauseCategories]
    : ['study']
  restPreset.value = detectPreset(restPauseAll.value, restPauseCategories.value)
  makeupEnabled.value = res.makeupEnabled !== false
  makeupDiscount.value = res.makeupDiscountPercent ?? 50
  makeupWindow.value = res.makeupWindowDays ?? 7
}

async function load() {
  try {
    const res: any = await http.get('/family/settings')
    settingsSnapshot.value = settingsToPutPayload(res)
    hydrateFromRes(res)
  } catch (e: any) {
    ElMessage.error(friendlyError(e, '约定暂时打不开'))
  }
}

function addExtra() {
  if (!extraPick.value) return ElMessage.warning('先选一天')
  if (!extras.value.includes(extraPick.value)) {
    extras.value = [...extras.value, extraPick.value].sort()
  }
  extraPick.value = ''
}

function removeExtra(d: string) {
  extras.value = extras.value.filter((x) => x !== d)
}

async function save() {
  if (
    restDaysEnabled.value &&
    !restPauseAll.value &&
    !restPauseCategories.value.length
  ) {
    return ElMessage.warning('请勾选要暂停的类别，或打开「暂停全部任务」')
  }
  saving.value = true
  try {
    const restPatch = {
      weeklyRestDays: weekly.value,
      extraRestDates: extras.value,
      restDaysEnabled: restDaysEnabled.value,
      restPauseAll: restPauseAll.value,
      restPauseCategories: restPauseCategories.value,
      makeupEnabled: makeupEnabled.value,
      makeupDiscountPercent: makeupDiscount.value,
      makeupWindowDays: makeupWindow.value,
    }
    // Only this page's fields — PUT is patch-merge on the server
    const saved: any = await http.put('/family/settings', restPatch)
    settingsSnapshot.value = settingsToPutPayload(saved || {
      ...settingsSnapshot.value,
      ...restPatch,
    })
    applySettingsFlags(saved || settingsSnapshot.value)
    void refreshFlags()
    bumpTaskSync()
    ElMessage.success('休息约定已保存')
  } catch (e: any) {
    ElMessage.error(friendlyError(e, '保存没成功'))
  } finally {
    saving.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.page-head-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  align-items: center;
}
.lead {
  margin: 0 0 16px;
  line-height: 1.55;
  color: var(--muted);
}
h3 {
  margin: 0 0 12px;
  font-family: var(--font-display);
}
.week-group {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.week-item {
  min-height: var(--tap-min);
  margin-right: 0 !important;
  padding: 0 8px;
}
.extra-row {
  display: flex;
  gap: 8px;
  margin-bottom: 10px;
}
.extra-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.extra-tag {
  margin: 0;
}
.makeup-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  min-height: var(--tap-min);
  padding: 8px 0;
  border-bottom: 1px dashed var(--line);
}
.tiny-hint {
  margin: 8px 0 0;
  font-size: 0.9rem;
}
.warn-hint {
  color: var(--accent-strong, #b45309) !important;
}
.full-tap {
  width: 100%;
  margin-top: 8px;
}
.advanced-fold {
  margin-bottom: 16px;
  border: none;
}
.advanced-fold :deep(.el-collapse-item__header) {
  font-weight: 600;
  font-size: 1rem;
}
.fold-section {
  padding: 8px 0 14px;
  border-bottom: 1px dashed var(--line);
}
.fold-section:last-child {
  border-bottom: none;
  padding-bottom: 0;
}
</style>
