<template>
  <div class="page">
    <div class="page-head">
      <h2 class="page-title" style="margin: 0">{{ labels.parentTasks }}</h2>
      <el-button type="primary" class="tap-btn" @click="openCreate">发布任务</el-button>
    </div>

    <div v-if="densityHint" class="card-panel density-hint">
      <strong>给学生留一点呼吸</strong>
      <p class="muted tiny-hint" style="margin: 6px 0 0">{{ densityHint }}</p>
    </div>

    <div v-if="firstWeekMicroHint" class="card-panel density-hint">
      <strong>首周少即是多</strong>
      <p class="muted tiny-hint" style="margin: 6px 0 0">{{ firstWeekMicroHint }}</p>
    </div>

    <div class="card-panel" v-if="taskProposals.length">
      <h3>孩子想加的小事 <el-tag type="warning" size="small">{{ taskProposals.length }}</el-tag></h3>
      <p class="muted tiny-hint">同意后会成为正式任务并指派给该孩子；拒绝请写一句说明。</p>
      <div v-for="p in taskProposals" :key="p.id" class="proposal-row">
        <div>
          <strong>{{ p.title }}</strong>
          <div class="muted tiny">
            {{ p.student?.name || p.studentId }}
            · {{ categoryLabel(p.category) }}
            <template v-if="p.suggestedMinutes"> · 约 {{ p.suggestedMinutes }} 分钟</template>
          </div>
          <p v-if="p.description" class="muted tiny">{{ p.description }}</p>
        </div>
        <div class="proposal-actions">
          <el-button type="primary" class="tap-btn" :loading="proposalBusy === p.id" @click="approveProposal(p)">
            同意加入
          </el-button>
          <el-button class="tap-btn" :loading="proposalBusy === p.id" @click="rejectProposal(p)">
            再商量
          </el-button>
        </div>
      </div>
    </div>

    <div class="tasks-shell" :class="{ 'is-split': useSplitEditor }">
      <div class="tasks-main">
        <!-- P1.1：已发布为主；模板降到列表下方 -->
        <div class="card-panel list-filter">
          <div class="list-filter-head">
            <strong>已发布</strong>
            <span class="muted">{{ filteredList.length }} / {{ list.length }}</span>
          </div>
          <div v-if="listStudentFilter" class="student-focus-row">
            <el-tag closable type="info" effect="plain" @close="clearStudentFilter">
              只看 {{ studentFilterName() }}
            </el-tag>
          </div>
          <div class="cat-scroll" role="tablist" aria-label="任务分类">
            <el-radio-group v-model="listCat" size="default" class="cat-row">
              <el-radio-button value="all">全部</el-radio-button>
              <el-radio-button value="study">学习</el-radio-button>
              <el-radio-button value="chore">家务</el-radio-button>
              <el-radio-button value="routine">习惯</el-radio-button>
              <el-radio-button value="eq">情商</el-radio-button>
            </el-radio-group>
          </div>
        </div>

        <div v-if="selectedIds.length" class="card-panel batch-bar">
          <span class="batch-count">已选 {{ selectedIds.length }} 项</span>
          <div class="batch-actions">
            <el-button class="tap-btn" :loading="batchBusy" @click="openBatchAssign">批量指派</el-button>
            <el-button class="tap-btn" type="danger" :loading="batchBusy" @click="batchRemove">
              批量删除
            </el-button>
            <el-button text class="tap-btn" @click="clearSelection">取消选择</el-button>
          </div>
        </div>

        <!-- Desktop / TV table -->
        <div v-if="isWide" class="card-panel">
          <EmptyState
            v-if="!list.length && !loading"
            title="还没有任务"
            description="展开下方「从模板添加」，选一件今天就能完成的小事先发布。建议每周加一件「情商」。"
            action-label="展开模板"
            @action="openTemplatesForEmpty"
          />
          <template v-else>
            <el-table
              ref="tableRef"
              :data="filteredList"
              v-loading="loading"
              empty-text="暂无任务"
              row-key="id"
              :row-class-name="tableRowClassName"
              @selection-change="onTableSelectionChange"
              @row-click="onTableRowClick"
            >
              <el-table-column type="selection" width="48" />
              <el-table-column prop="title" label="任务" min-width="160">
                <template #default="{ row }">
                  <div>{{ row.title }}</div>
                  <p v-if="row.upgradeHint" class="muted tiny upgrade-hint">{{ row.upgradeHint }}</p>
                </template>
              </el-table-column>
              <el-table-column label="类型" width="80">
                <template #default="{ row }">{{ labelCategory(row.category) }}</template>
              </el-table-column>
              <el-table-column label="时段" width="90">
                <template #default="{ row }">{{ slotLabel(row.timeSlot) }}</template>
              </el-table-column>
              <el-table-column label="周期" width="90">
                <template #default="{ row }">{{ labelSchedule(row.schedule, 'list') }}</template>
              </el-table-column>
              <el-table-column label="目标" width="110">
                <template #default="{ row }">{{ targetLabel(row) }}</template>
              </el-table-column>
              <el-table-column label="难度" width="80">
                <template #default="{ row }">{{ row.difficultyLabel || '熟练' }}</template>
              </el-table-column>
              <el-table-column label="积分" prop="pointsReward" width="70" />
              <el-table-column label="确认" width="88">
                <template #default="{ row }">
                  <el-tag v-if="row.requireConfirm" size="small" type="warning" effect="plain">
                    需确认
                  </el-tag>
                  <el-tag
                    v-if="row.sharedComplete"
                    size="small"
                    type="success"
                    effect="plain"
                    style="margin-left: 4px"
                  >
                    {{ row.rotateEnabled ? '共享·轮值' : '共享' }}
                  </el-tag>
                  <span v-else-if="!row.requireConfirm" class="muted">—</span>
                </template>
              </el-table-column>
              <el-table-column label="指派" min-width="160">
                <template #default="{ row }">
                  <el-tag
                    v-for="a in row.assigns || []"
                    :key="a.id"
                    size="small"
                    style="margin: 2px"
                  >
                    {{ a.student?.name }} {{ Math.round(a.progressPercent) }}%
                  </el-tag>
                  <span v-if="!row.assigns?.length" class="muted">未指派</span>
                </template>
              </el-table-column>
              <el-table-column label="操作" width="240" fixed="right">
                <template #default="{ row }">
                  <el-button text type="primary" @click.stop="openEdit(row)">编辑</el-button>
                  <el-button text type="primary" @click.stop="openAssign(row)">指派</el-button>
                  <el-button text type="danger" @click.stop="remove(row)">删除</el-button>
                </template>
              </el-table-column>
            </el-table>
            <div v-if="!loading && list.length && !filteredList.length" class="filter-empty muted">
              当前分类下没有已发布任务
            </div>
          </template>
        </div>

        <!-- Phone / tablet cards -->
        <div v-else class="task-grid">
          <div
            v-for="t in filteredList"
            :key="t.id"
            class="card-panel task-card"
            :class="{ 'task-card-focus': focusTaskId === t.id || (dlg && editingId === t.id) }"
          >
            <div class="task-card-main">
              <el-checkbox
                class="task-check"
                :model-value="selectedIds.includes(t.id)"
                @change="(v: boolean | string | number) => toggleSelect(t.id, !!v)"
              />
              <div class="task-card-body">
                <h3>{{ t.title }}</h3>
                <p v-if="t.upgradeHint" class="upgrade-hint">{{ t.upgradeHint }}</p>
                <p class="muted">
                  {{ labelCategory(t.category) }} · {{ slotLabel(t.timeSlot) }} ·
                  {{ labelSchedule(t.schedule, 'list') }} · {{ targetLabel(t) }} · {{ t.pointsReward }} 积分
                  <span v-if="t.requireConfirm"> · 需确认</span>
                  <span v-if="t.sharedComplete"> · 共享完成</span>
                  <span v-if="t.rotateEnabled"> · 轮值</span>
                </p>
                <p v-if="t.description">{{ t.description }}</p>
                <div v-if="t.steps?.length" class="steps">
                  <el-tag v-for="s in t.steps" :key="s.id" size="small" style="margin: 2px">
                    {{ s.title }}
                  </el-tag>
                </div>
                <div class="muted assigns">
                  已指派：
                  <template v-if="t.assigns?.length">
                    <el-tag
                      v-for="a in t.assigns"
                      :key="a.id"
                      size="small"
                      style="margin: 2px"
                    >
                      {{ a.student?.name }} {{ Math.round(a.progressPercent) }}%
                    </el-tag>
                  </template>
                  <span v-else>无</span>
                </div>
              </div>
            </div>
            <div class="actions">
              <el-button class="tap-btn" @click="openEdit(t)">编辑</el-button>
              <el-button class="tap-btn" @click="openAssign(t)">指派</el-button>
              <el-dropdown trigger="click">
                <el-button class="tap-btn">更多</el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item @click="remove(t)">删除任务</el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </div>
          </div>
          <div v-if="!list.length && !loading" class="card-panel">
            <EmptyState
              title="还没有任务"
              description="展开下方「从模板添加」，选一件今天就能完成的小事先发布。建议每周加一件「情商」。"
              action-label="展开模板"
              @action="openTemplatesForEmpty"
            />
          </div>
          <div v-else-if="list.length && !filteredList.length && !loading" class="card-panel">
            <EmptyState
              title="当前分类没有任务"
              description="换一个「已发布」分类看看，或展开模板发布一件。"
            />
          </div>
        </div>

        <!-- 系统模板：列表之后；默认折叠 -->
        <div ref="templatesRef" class="card-panel templates">
          <button type="button" class="templates-toggle" @click="toggleTemplatesOpen">
            <span class="templates-toggle-main">
              <strong>从模板添加</strong>
              <span class="muted">（{{ visibleTemplateCount }}）</span>
            </span>
            <span class="muted templates-chevron">{{ templatesOpen ? '收起' : '展开' }}</span>
          </button>
          <p v-if="!templatesOpen" class="muted tiny-hint templates-peek">
            {{
              list.length
                ? '需要时再展开选用；点模板会打开发布表单，可再改再发。'
                : '还没有任务时，展开模板选一件小事先发布。'
            }}
          </p>

          <div v-show="templatesOpen" class="templates-body">
            <div class="cat-scroll" role="tablist" aria-label="模板分类">
              <el-radio-group v-model="tplCat" size="default" class="cat-row">
                <el-radio-button value="all">全部</el-radio-button>
                <el-radio-button value="study">学习</el-radio-button>
                <el-radio-button value="chore">家务</el-radio-button>
                <el-radio-button value="routine">习惯</el-radio-button>
                <el-radio-button value="eq">情商</el-radio-button>
              </el-radio-group>
            </div>

            <div class="tpl-toolbar">
              <el-button
                text
                type="primary"
                class="tap-btn"
                @click="tplPickMode = !tplPickMode"
              >
                {{ tplPickMode ? '取消多选' : '多选发布' }}
              </el-button>
              <el-button
                v-if="tplPickMode && selectedTplIds.length"
                type="primary"
                class="tap-btn"
                :loading="tplBatchBusy"
                @click="batchPublishTemplates"
              >
                用所选发布（{{ selectedTplIds.length }}）
              </el-button>
              <el-button
                v-if="hiddenTplIds.length"
                text
                class="tap-btn"
                @click="restoreHiddenTemplates"
              >
                恢复已隐藏（{{ hiddenTplIds.length }}）
              </el-button>
            </div>

            <div class="template-grid">
              <div
                v-for="tpl in filteredTemplates"
                :key="tpl.id"
                class="tpl-chip"
                :class="{ 'tpl-chip-pick': tplPickMode, selected: selectedTplIds.includes(tpl.id) }"
              >
                <el-checkbox
                  v-if="tplPickMode"
                  class="tpl-check"
                  :model-value="selectedTplIds.includes(tpl.id)"
                  @change="(v: boolean | string | number) => toggleTplSelect(tpl.id, !!v)"
                />
                <button type="button" class="tpl-chip-main" @click="onTplPrimary(tpl)">
                  <span class="tpl-title">{{ tpl.title }}</span>
                  <span class="muted tpl-meta">
                    {{ labelCategory(tpl.category) }} · {{ slotLabel(tpl.timeSlot) }} ·
                    {{ tpl.pointsReward }}分
                  </span>
                </button>
                <el-dropdown trigger="click" @command="(cmd: string) => onTplCommand(cmd, tpl)">
                  <el-button text class="tpl-more" @click.stop>⋯</el-button>
                  <template #dropdown>
                    <el-dropdown-menu>
                      <el-dropdown-item command="apply">选用并编辑</el-dropdown-item>
                      <el-dropdown-item command="hide">隐藏此模板</el-dropdown-item>
                    </el-dropdown-menu>
                  </template>
                </el-dropdown>
              </div>
            </div>
            <p v-if="!filteredTemplates.length" class="muted tiny-hint">
              这一类没有可显示的模板（可能已全部隐藏）。
            </p>
          </div>
        </div>
      </div>

      <ParentTaskEditDrawer
        v-model="dlg"
        :inline="useSplitEditor"
        :form="form"
        :students="students"
        :editing-id="editingId"
        :saving="saving"
        :slot-option-groups="slotOptionGroups"
        :category-hint="categoryHint"
        :schedule-hint="scheduleHint"
        :confirm-hint="confirmHint"
        :shared-complete-hint="sharedCompleteHint"
        :rotate-hint="rotateHint"
        :theme-suggest-chips="themeSuggestChips"
        :theme-suggest-label="themeSuggestLabel"
        @save="save"
      />
    </div>

    <el-dialog
      v-model="assignDlg"
      :title="batchAssignMode ? '批量指派学生' : '指派学生'"
      width="90%"
      style="max-width: 420px"
    >
      <p class="muted tiny-hint" style="margin-top: 0">
        <template v-if="batchAssignMode">
          将对已选 {{ selectedIds.length }} 个任务统一设置指派；取消勾选会撤销对应学生任务。
        </template>
        <template v-else>取消勾选会撤销该学生的任务（历史打卡保留）</template>
      </p>
      <el-select v-model="assignIds" multiple size="large" style="width: 100%">
        <el-option v-for="s in students" :key="s.id" :label="s.name" :value="s.id" />
      </el-select>
      <template #footer>
        <el-button class="tap-btn full-tap" type="primary" :loading="batchBusy" @click="doAssign">
          确定
        </el-button>
      </template>
    </el-dialog>

    <SoftPrompt
      v-model="approvePrompt.open"
      title="同意加入清单"
      :message="approvePrompt.message"
      placeholder="或写分值，例如 5"
      confirm-text="加入清单"
      cancel-text="取消"
      :require-note="false"
      :templates="approvePointTemplates"
      :initial-note="'5 分（推荐）'"
      hint="不选也默认 5 分"
      @confirm="onApproveConfirm"
    />
    <SoftPrompt
      v-model="rejectPrompt.open"
      title="再商量"
      :message="rejectPrompt.message"
      placeholder="例如：这周任务已经够多了，下周再试"
      confirm-text="发送"
      cancel-text="取消"
      :require-note="true"
      :templates="rejectTemplates"
      hint="写一句给孩子，沟通更顺畅"
      @confirm="onRejectConfirm"
    />
    <SoftPrompt
      v-model="deletePrompt.open"
      title="删除任务"
      :message="deletePrompt.message"
      confirm-text="删除"
      cancel-text="取消"
      :show-input="false"
      @confirm="onDeleteConfirm"
    />
    <SoftPrompt
      v-model="batchPrompt.open"
      :title="batchPrompt.title"
      :message="batchPrompt.message"
      :confirm-text="batchPrompt.confirmText"
      cancel-text="取消"
      :show-input="false"
      @confirm="onBatchPromptConfirm"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onActivated, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import type { TableInstance } from 'element-plus'
import http from '../../api/http'
import { useBreakpoint } from '../../composables/useBreakpoint'
import EmptyState from '../../components/EmptyState.vue'
import SoftPrompt from '../../components/SoftPrompt.vue'
import { buildDeleteTaskSoftMessage } from '../../composables/restDayDeleteSoftCopy'
import ParentTaskEditDrawer from '../../components/ParentTaskEditDrawer.vue'
import { isLifeHabitCategory } from '../../composables/restDayPolicy'
import {
  analyzeDailySlotDensity,
  labelSlot as slotLabelFn,
  slotOrderForUi,
} from '../../composables/timeSlotPolicy'
import { labels } from '../../composables/labels'
import {
  labelCategory,
  labelSchedule,
  labelTarget,
} from '../../composables/taskLabels'
import { createLoadGate, tryBegin } from '../../composables/asyncGuard'
import { suggestionsForThemePreset } from '../../composables/themeWeek'

defineOptions({ name: 'ParentTasksView' })

const HIDDEN_TPL_KEY = 'xueji.hiddenTaskTemplates'
const TPL_OPEN_KEY = 'xueji.taskTemplatesOpen'

const { isWide, isTablet, isDesktop } = useBreakpoint()
/** 平板 / 桌面主从分栏；手机与 TV 用抽屉 */
const useSplitEditor = computed(() => isTablet.value || isDesktop.value)
const route = useRoute()
const router = useRouter()
const list = ref<any[]>([])
const taskProposals = ref<any[]>([])
const proposalBusy = ref(0)
const approvePrompt = reactive({
  open: false,
  proposal: null as any,
  message: '',
})
const rejectPrompt = reactive({
  open: false,
  proposalId: 0,
  message: '',
})
const approvePointTemplates = ['5 分（推荐）', '10 分', '先不计分']
const rejectTemplates = [
  '这周任务已经够多了，下周再试',
  '先把正在练的小事稳住，再加新的',
  '这个想法很好，我们改成更小的一步再试',
]
const deletePrompt = reactive({
  open: false,
  taskId: 0,
  message: '',
})
const batchPrompt = reactive({
  open: false,
  mode: '' as '' | 'publish' | 'remove',
  title: '',
  message: '',
  confirmText: '确定',
  ids: [] as string[],
})
const students = ref<any[]>([])
const templates = ref<any[]>([])
const tasksLoadGate = createLoadGate()
let skipActivatedLoad = true
const slotExtendedEnabled = ref(localStorage.getItem('slotExtendedEnabled') === '1')
const slotOptionGroups = computed(() => {
  const order = slotOrderForUi(slotExtendedEnabled.value)
  const baseKeys = new Set([
    'after_wake',
    'after_school',
    'after_dinner',
    'bedtime',
    'anytime',
  ])
  const base = order
    .filter((s) => baseKeys.has(s))
    .map((s) => ({ value: s, label: slotLabelFn(s) }))
  const ext = order
    .filter((s) => !baseKeys.has(s))
    .map((s) => ({ value: s, label: slotLabelFn(s) }))
  const groups = [{ label: '常用时段', options: base }]
  if (ext.length) groups.push({ label: '扩展时段', options: ext })
  return groups
})
/** 已发布列表分类 */
const listCat = ref('all')
/** P3：从看板深链筛选某孩 */
const listStudentFilter = ref(0)
const focusTaskId = ref(0)
let pendingAssignId = 0
/** 模板区分类（与列表独立） */
const tplCat = ref('all')
const loading = ref(false)
const saving = ref(false)
const batchBusy = ref(false)
const tplBatchBusy = ref(false)
const dlg = ref(false)
const assignDlg = ref(false)
const batchAssignMode = ref(false)
const currentId = ref(0)
/** 0 = create mode */
const editingId = ref(0)
const assignIds = ref<number[]>([])
const selectedIds = ref<number[]>([])
const selectedTplIds = ref<string[]>([])
const tplPickMode = ref(false)
const hiddenTplIds = ref<string[]>(loadHiddenTplIds())
/** 展开态；有任务时写入 localStorage 记忆 */
const templatesOpen = ref(false)
const tableRef = ref<TableInstance>()
const form = reactive({
  title: '',
  description: '',
  category: 'study',
  timeSlot: 'anytime',
  schedule: 'daily',
  targetType: 'once',
  targetValue: 1,
  pointsReward: 10,
  difficultyLevel: 'practice',
  intentionCue: '',
  intentionWhen: '',
  isMicroHabit: false,
  jointComplete: false,
  requireConfirm: false,
  sharedComplete: false,
  rotateEnabled: false,
  isInterest: false,
  meaningNote: '',
  deadline: '' as string,
  stepsText: '',
  studentIds: [] as number[],
  sourceTemplateId: '' as string,
})

const themeSuggestChips = ref<string[]>([])
const themeSuggestLabel = ref('')

async function refreshThemeSuggests() {
  themeSuggestChips.value = []
  themeSuggestLabel.value = ''
  if (editingId.value || !form.studentIds.length) return
  const sid = form.studentIds[0]
  try {
    const g: any = await http.get(`/students/${sid}/weekly-goal`)
    const chips = suggestionsForThemePreset(g.themePreset || '')
    themeSuggestChips.value = chips
    themeSuggestLabel.value = g.themeTitle || ''
  } catch {
    /* ignore */
  }
}

watch(
  () => [dlg.value, editingId.value, [...form.studentIds].join(',')] as const,
  () => {
    if (dlg.value) void refreshThemeSuggests()
  },
)

function loadHiddenTplIds(): string[] {
  try {
    const raw = localStorage.getItem(HIDDEN_TPL_KEY)
    const arr = raw ? JSON.parse(raw) : []
    return Array.isArray(arr) ? arr.map(String) : []
  } catch {
    return []
  }
}

function persistHiddenTplIds() {
  localStorage.setItem(HIDDEN_TPL_KEY, JSON.stringify(hiddenTplIds.value))
}

function loadTemplatesOpenPref(): boolean {
  try {
    return localStorage.getItem(TPL_OPEN_KEY) === '1'
  } catch {
    return false
  }
}

function persistTemplatesOpenPref(open: boolean) {
  localStorage.setItem(TPL_OPEN_KEY, open ? '1' : '0')
}

function toggleTemplatesOpen() {
  templatesOpen.value = !templatesOpen.value
  if (list.value.length) persistTemplatesOpenPref(templatesOpen.value)
}

const templatesRef = ref<HTMLElement | null>(null)

function openTemplatesForEmpty() {
  templatesOpen.value = true
  nextTick(() => {
    templatesRef.value?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  })
}

function tableRowClassName({ row }: { row: { id: number } }) {
  if (dlg.value && editingId.value === row.id) return 'task-row-active'
  if (focusTaskId.value === row.id) return 'task-row-active'
  return ''
}

function onTableRowClick(row: { id: number }, _col: unknown, event: MouseEvent) {
  if (!useSplitEditor.value) return
  const t = event.target as HTMLElement | null
  if (t?.closest('.el-checkbox, .el-button, a')) return
  openEdit(row)
}

function isEqSourceId(id: string | null | undefined) {
  const s = String(id || '')
  return s.startsWith('eq-') || s.startsWith('life-')
}

const eqTemplateTitles = computed(() => {
  const titles = new Set<string>()
  for (const t of templates.value) {
    if (isEqSourceId(t.id) && t.title) titles.add(String(t.title))
  }
  return titles
})

const visibleTemplates = computed(() => {
  const hidden = new Set(hiddenTplIds.value)
  return templates.value.filter((t) => !hidden.has(String(t.id)))
})

const visibleTemplateCount = computed(() => visibleTemplates.value.length)

const filteredTemplates = computed(() => {
  const base = visibleTemplates.value
  if (tplCat.value === 'all') return base
  if (tplCat.value === 'eq') {
    return base.filter((t) => isEqSourceId(t.id))
  }
  return base.filter((t) => t.category === tplCat.value)
})

const filteredList = computed(() => {
  let base = list.value
  if (listStudentFilter.value) {
    base = base.filter((t) =>
      (t.assigns || []).some((a: any) => a.studentId === listStudentFilter.value),
    )
  }
  if (listCat.value === 'all') return base
  if (listCat.value === 'eq') {
    const titles = eqTemplateTitles.value
    return base.filter((t) => {
      if (isEqSourceId(t.sourceTemplateId)) return true
      if (!t.sourceTemplateId && titles.has(String(t.title || ''))) return true
      return false
    })
  }
  return base.filter((t) => t.category === listCat.value)
})

function studentFilterName() {
  if (!listStudentFilter.value) return ''
  return students.value.find((s) => s.id === listStudentFilter.value)?.name || '孩子'
}

function clearStudentFilter() {
  listStudentFilter.value = 0
  focusTaskId.value = 0
  pendingAssignId = 0
  router.replace({ path: '/parent/tasks' })
}

function findTaskByAssignId(assignId: number) {
  return list.value.find((t) =>
    (t.assigns || []).some((a: any) => a.id === assignId),
  )
}

function applyRouteFocus() {
  const sid = Number(route.query.studentId)
  const assignId = Number(route.query.assignId)
  const focus = String(route.query.focus || '')
  listStudentFilter.value = sid > 0 ? sid : 0
  if (assignId > 0) pendingAssignId = assignId

  if (focus === 'rotate') {
    ElMessage.info('打开共享家务任务，打开「按天轮值」，让分工更均匀')
    router.replace({
      path: '/parent/tasks',
      query: listStudentFilter.value ? { studentId: String(listStudentFilter.value) } : {},
    })
  }

  if (pendingAssignId && list.value.length) {
    const task = findTaskByAssignId(pendingAssignId)
    if (task) {
      focusTaskId.value = task.id
      pendingAssignId = 0
      nextTick(() => openEdit(task))
      router.replace({
        path: '/parent/tasks',
        query: listStudentFilter.value ? { studentId: String(listStudentFilter.value) } : {},
      })
    }
  }
}

watch(listCat, () => {
  clearSelection()
})

watch(tplPickMode, (on) => {
  if (!on) selectedTplIds.value = []
})

function clearSelection() {
  selectedIds.value = []
  nextTick(() => {
    tableRef.value?.clearSelection()
  })
}

function onTableSelectionChange(rows: any[]) {
  selectedIds.value = rows.map((r) => r.id)
}

function toggleSelect(id: number, checked: boolean) {
  if (checked) {
    if (!selectedIds.value.includes(id)) selectedIds.value = [...selectedIds.value, id]
  } else {
    selectedIds.value = selectedIds.value.filter((x) => x !== id)
  }
}

function toggleTplSelect(id: string, checked: boolean) {
  const sid = String(id)
  if (checked) {
    if (!selectedTplIds.value.includes(sid)) {
      selectedTplIds.value = [...selectedTplIds.value, sid]
    }
  } else {
    selectedTplIds.value = selectedTplIds.value.filter((x) => x !== sid)
  }
}

function onTplPrimary(tpl: any) {
  if (tplPickMode.value) {
    const sid = String(tpl.id)
    toggleTplSelect(sid, !selectedTplIds.value.includes(sid))
    return
  }
  applyTemplate(tpl)
}

function onTplCommand(cmd: string, tpl: any) {
  if (cmd === 'apply') applyTemplate(tpl)
  if (cmd === 'hide') hideTemplate(tpl)
}

function hideTemplate(tpl: any) {
  const sid = String(tpl.id)
  if (!hiddenTplIds.value.includes(sid)) {
    hiddenTplIds.value = [...hiddenTplIds.value, sid]
    persistHiddenTplIds()
  }
  selectedTplIds.value = selectedTplIds.value.filter((x) => x !== sid)
  ElMessage.success('已隐藏此模板（可点「恢复已隐藏」找回）')
}

function restoreHiddenTemplates() {
  hiddenTplIds.value = []
  persistHiddenTplIds()
  ElMessage.success('已恢复全部隐藏的模板')
}

function deadlineToDateInput(deadline: string | Date | null | undefined) {
  if (!deadline) return ''
  const d = typeof deadline === 'string' ? deadline : deadline.toISOString()
  return d.slice(0, 10)
}

function buildPayload() {
  const steps = form.stepsText
    .split(/[,，]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((title, i) => ({ title, sortOrder: i }))
  return {
    title: form.title,
    description: form.description,
    category: form.category,
    timeSlot: form.timeSlot,
    schedule: form.schedule,
    targetType: form.targetType,
    targetValue: form.targetValue,
    pointsReward: form.pointsReward,
    difficultyLevel: form.difficultyLevel,
    intentionCue: form.intentionCue?.trim() || null,
    intentionWhen: form.intentionWhen?.trim() || null,
    isMicroHabit: form.isMicroHabit,
    jointComplete: form.jointComplete,
    requireConfirm: form.requireConfirm,
    sharedComplete: form.sharedComplete,
    rotateEnabled: form.sharedComplete && form.rotateEnabled,
    isInterest: form.isInterest,
    meaningNote: form.meaningNote?.trim() || null,
    deadline:
      form.schedule === 'once'
        ? form.deadline
          ? `${form.deadline}T23:59:59.000Z`
          : null
        : null,
    steps,
    studentIds: form.studentIds,
    sourceTemplateId: form.sourceTemplateId || undefined,
  }
}

function slotLabel(s: string) {
  return slotLabelFn(s)
}

const densityHint = computed(() => {
  const enriched = list.value.map((t) => ({
    ...t,
    assigns: (t.assigns || []).map((a: any) => ({
      ...a,
      student:
        a.student ||
        students.value.find((s: any) => s.id === a.studentId) || {
          id: a.studentId,
          name: `学生${a.studentId}`,
        },
    })),
  }))
  const r = analyzeDailySlotDensity(enriched)
  return r.level === 'warn' ? r.message : ''
})

const firstWeekMicroHint = computed(() => {
  const daily = list.value.filter((t) => t.active && t.schedule === 'daily')
  if (daily.length <= 2) return ''
  const microCount = daily.filter((t) => t.isMicroHabit).length
  if (microCount >= daily.length - 1) return ''
  return '首周建议只留 1～2 个微习惯（2–5 分钟），比一次铺满更重要。等节奏稳了再加。'
})
function targetLabel(t: any) {
  return labelTarget(t)
}

const categoryHint = computed(() => {
  if (form.category === 'chore') {
    return '家务：休息日仍会出现。建议不必每次「需确认」——信任节奏比审批更重要；大项或高分任务再开确认。'
  }
  if (form.category === 'routine') {
    return '生活习惯：休息日照常。小习惯建议关掉「需确认」，减少催促感；学习大项再开闸。'
  }
  return '学习：休息日循环任务不催促。较难或高积分任务可开「需确认」，方便过程赞。'
})

const confirmHint = computed(() => {
  if (!form.requireConfirm) {
    return isLifeHabitCategory(form.category)
      ? '当前不确认即加分，适合家务/习惯：做完就闭环，保护胜任感。'
      : '不确认即加分；较难的学习项若想写过程赞，再打开开关。'
  }
  if (isLifeHabitCategory(form.category)) {
    return '注意：家务/习惯天天确认，容易变成「做完还等审判」。除非特别需要看过程，建议关掉。'
  }
  return '提交后等家长看一眼，通过后才加分——记得写过程赞，而不是只点通过。'
})

const sharedCompleteHint = computed(() => {
  if (!form.sharedComplete) {
    return '默认各自完成。适合学习、刷牙等「每个人都要做」的事。'
  }
  if (form.category === 'chore') {
    return '适合倒垃圾、摆碗筷等全家只需一人做的家务：有人做完后，其他人今天不再催。'
  }
  return '有一人有效完成后，其余未做的同学今天不再催（不是比赛，是分担）。学习类请谨慎开启。'
})

const rotateHint = computed(() => {
  if (!form.rotateEnabled) {
    return '关闭时：谁先做完谁完成，其他人今天歇一歇。打开后：按天轮流主责，更公平。'
  }
  return '按指派学生与家里排行轮流「今天主责」；非主责不进今日催促，仍可自愿帮忙。建议在学生管理里设好排行（1=大孩）。'
})

const scheduleHint = computed(() => {
  if (form.schedule === 'once') return '一次性任务按截止日期；过期可申请补上进度。'
  if (isLifeHabitCategory(form.category)) {
    return '建议家务/习惯用「每日」循环；休息日也会出现。'
  }
  return '每日/每周会按周期重置进度；休息日学习类不出现在今日主列表。'
})

/** 切换为家务/习惯时，默认改为每日循环，便于养成习惯 */
watch(
  () => form.jointComplete,
  (joint) => {
    if (joint) {
      form.sharedComplete = false
      form.rotateEnabled = false
      if (form.pointsReward > 0) form.pointsReward = 0
    }
  },
)

watch(
  () => form.sharedComplete,
  (shared) => {
    if (shared) form.jointComplete = false
  },
)

watch(
  () => form.category,
  (cat, prev) => {
    if (!dlg.value) return
    if (isLifeHabitCategory(cat) && !isLifeHabitCategory(prev)) {
      if (form.schedule === 'once') form.schedule = 'daily'
      // 家务/习惯默认不强制确认，保护节奏与信任
      if (form.requireConfirm) form.requireConfirm = false
    }
  },
)

/** 多孩 + 共享完成：默认建议轮值 */
watch(
  () => [form.sharedComplete, form.studentIds.length, form.category] as const,
  ([shared, n, cat]) => {
    if (!dlg.value) return
    if (shared && n >= 2 && (cat === 'chore' || cat === 'routine')) {
      form.rotateEnabled = true
    }
    if (!shared) form.rotateEnabled = false
  },
)

async function load() {
  const ticket = tasksLoadGate.next()
  loading.value = true
  try {
    const [taskList, studentList, tplList, settings, proposals] = await Promise.all([
      http.get('/tasks'),
      http.get('/students'),
      http.get('/task-templates'),
      http.get('/family/settings').catch(() => null),
      http.get('/task-proposals').catch(() => []),
    ])
    if (!ticket.isCurrent()) return
    list.value = taskList as any[]
    taskProposals.value = (proposals as any[]) || []
    students.value = studentList as any[]
    templates.value = tplList as any[]
    if (settings && typeof settings === 'object') {
      slotExtendedEnabled.value = !!(settings as any).slotExtendedEnabled
      localStorage.setItem(
        'slotExtendedEnabled',
        slotExtendedEnabled.value ? '1' : '0',
      )
    }
    const alive = new Set(list.value.map((t) => t.id))
    selectedIds.value = selectedIds.value.filter((id) => alive.has(id))
    templatesOpen.value = !list.value.length || loadTemplatesOpenPref()
    applyRouteFocus()
  } finally {
    if (ticket.isCurrent()) loading.value = false
  }
}

function categoryLabel(c: string) {
  return ({ study: '学习', chore: '家务', routine: '习惯' } as Record<string, string>)[c] || c
}

function parseProposalPoints(note: string) {
  const n = note.trim()
  if (!n) return 5
  if (/不计分|^0\b/.test(n)) return 0
  const m = n.match(/(\d+)\s*分/)
  if (m) return Math.min(50, Math.max(0, Number(m[1])))
  if (/^\d+$/.test(n)) return Math.min(50, Math.max(0, Number(n)))
  return 5
}

function approveProposal(p: any) {
  approvePrompt.proposal = p
  approvePrompt.message = `${p.student?.name || '孩子'}想加「${p.title}」。选一个建议分值，商量着来。`
  approvePrompt.open = true
}

async function onApproveConfirm(note: string) {
  const p = approvePrompt.proposal
  approvePrompt.open = false
  approvePrompt.proposal = null
  if (!p) return
  if (proposalBusy.value) return
  proposalBusy.value = p.id
  try {
    await http.post(`/task-proposals/${p.id}/approve`, {
      pointsReward: parseProposalPoints(note),
    })
    ElMessage.success(`已加入「${p.title}」`)
    await load()
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message || '操作失败')
  } finally {
    proposalBusy.value = 0
  }
}

async function rejectProposal(p: any) {
  rejectPrompt.message = `写一句说明，帮孩子理解为什么「${p.title}」暂时不合适`
  rejectPrompt.proposalId = p.id
  rejectPrompt.open = true
}

async function onRejectConfirm(note: string) {
  const id = rejectPrompt.proposalId
  rejectPrompt.open = false
  if (!id || !note.trim()) return
  if (proposalBusy.value) return
  proposalBusy.value = id
  try {
    await http.post(`/task-proposals/${id}/reject`, { note: note.trim() })
    ElMessage.success('已回复孩子')
    await load()
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message || '操作失败')
  } finally {
    proposalBusy.value = 0
  }
}

function openCreate() {
  editingId.value = 0
  Object.assign(form, {
    title: '',
    description: '',
    category: 'study',
    timeSlot: 'anytime',
    schedule: 'daily',
    targetType: 'once',
    targetValue: 1,
    pointsReward: 10,
    difficultyLevel: 'practice',
    intentionCue: '',
    intentionWhen: '',
    isMicroHabit: false,
    jointComplete: false,
    requireConfirm: false,
    sharedComplete: false,
    rotateEnabled: false,
    isInterest: false,
    meaningNote: '',
    deadline: '',
    stepsText: '',
    studentIds: students.value.map((s) => s.id),
    sourceTemplateId: '',
  })
  const qTitle = String(route.query.suggestTitle || '').trim()
  const qSid = Number(route.query.studentId)
  const qMicro = String(route.query.suggestMicro || '') === '1'
  if (qTitle) form.title = qTitle.slice(0, 80)
  if (qSid && students.value.some((s) => s.id === qSid)) {
    form.studentIds = [qSid]
  }
  if (qTitle || qMicro) {
    form.isMicroHabit = true
    form.category = 'routine'
    form.pointsReward = 5
    form.schedule = 'daily'
  }
  dlg.value = true
  if (qTitle || qSid || qMicro) {
    router.replace({ path: '/parent/tasks', query: {} })
    if (qTitle) {
      ElMessage.info('标题已预填为微习惯，确认后点「发布」才会创建')
    }
  }
}

function openEdit(t: any) {
  editingId.value = t.id
  const sortedSteps = [...(t.steps || [])].sort(
    (a: any, b: any) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0),
  )
  Object.assign(form, {
    title: t.title || '',
    description: t.description || '',
    category: t.category || 'study',
    timeSlot: t.timeSlot || 'anytime',
    schedule: t.schedule || 'daily',
    targetType: t.targetType || 'once',
    targetValue: t.targetValue ?? 1,
    pointsReward: t.pointsReward ?? 10,
    difficultyLevel: t.difficultyLevel || 'practice',
    intentionCue: t.intentionCue || '',
    intentionWhen: t.intentionWhen || '',
    isMicroHabit: !!t.isMicroHabit,
    jointComplete: !!t.jointComplete,
    requireConfirm: !!t.requireConfirm,
    sharedComplete: !!t.sharedComplete,
    rotateEnabled: !!t.rotateEnabled,
    isInterest: !!t.isInterest,
    meaningNote: t.meaningNote || '',
    deadline: deadlineToDateInput(t.deadline),
    stepsText: sortedSteps.map((s: any) => s.title).join(','),
    studentIds: (t.assigns || []).map((a: any) => a.studentId),
    sourceTemplateId: t.sourceTemplateId || '',
  })
  dlg.value = true
}

function applyTemplate(tpl: any) {
  editingId.value = 0
  Object.assign(form, {
    title: tpl.title,
    description: tpl.description || '',
    category: tpl.category,
    timeSlot: tpl.timeSlot,
    schedule: tpl.schedule,
    targetType: tpl.targetType,
    targetValue: tpl.targetValue,
    pointsReward: tpl.pointsReward,
    difficultyLevel: 'practice',
    intentionCue: tpl.intentionCue || '',
    intentionWhen: tpl.intentionWhen || '',
    isMicroHabit: !!tpl.isMicroHabit,
    jointComplete: false,
    requireConfirm: !!tpl.requireConfirm,
    // 家务模板默认建议「共享完成」；多孩时可再开轮值
    sharedComplete: tpl.category === 'chore',
    rotateEnabled:
      tpl.category === 'chore' && students.value.length >= 2,
    isInterest: !!tpl.isInterest,
    meaningNote: tpl.meaningNote || '',
    deadline: '',
    stepsText: '',
    studentIds: students.value.map((s) => s.id),
    sourceTemplateId: String(tpl.id || ''),
  })
  dlg.value = true
}

function payloadFromTemplate(tpl: any) {
  return {
    title: tpl.title,
    description: tpl.description || '',
    category: tpl.category,
    timeSlot: tpl.timeSlot || 'anytime',
    schedule: tpl.schedule || 'daily',
    targetType: tpl.targetType || 'once',
    targetValue: tpl.targetValue ?? 1,
    pointsReward: tpl.pointsReward ?? 10,
    difficultyLevel: 'practice',
    requireConfirm: !!tpl.requireConfirm,
    sharedComplete: tpl.category === 'chore',
    rotateEnabled:
      tpl.category === 'chore' && students.value.length >= 2,
    isInterest: !!tpl.isInterest,
    meaningNote: tpl.meaningNote || null,
    deadline: null,
    steps: [] as { title: string; sortOrder: number }[],
    studentIds: students.value.map((s) => s.id),
    sourceTemplateId: String(tpl.id || '') || undefined,
  }
}

function batchPublishTemplates() {
  const ids = selectedTplIds.value
  if (!ids.length) return
  const chosen = templates.value.filter((t) => ids.includes(String(t.id)))
  if (!chosen.length) return
  batchPrompt.mode = 'publish'
  batchPrompt.ids = ids.map(String)
  batchPrompt.title = '批量选用发布'
  batchPrompt.message = `将按模板默认值发布 ${chosen.length} 个任务，并指派给当前全部学生。发布后仍可在列表里编辑。`
  batchPrompt.confirmText = '发布'
  batchPrompt.open = true
}

async function runBatchPublish() {
  const ids = batchPrompt.ids
  const chosen = templates.value.filter((t) => ids.includes(String(t.id)))
  if (!chosen.length) return
  tplBatchBusy.value = true
  let ok = 0
  const errors: string[] = []
  try {
    for (const tpl of chosen) {
      try {
        await http.post('/tasks', payloadFromTemplate(tpl))
        ok++
      } catch (e: any) {
        errors.push(`${tpl.title}: ${e.message || '失败'}`)
      }
    }
    if (ok) ElMessage.success(`已发布 ${ok} 个任务`)
    if (errors.length) {
      ElMessage.warning(`${errors.length} 个失败：${errors.slice(0, 2).join('；')}`)
    }
    tplPickMode.value = false
    selectedTplIds.value = []
    await load()
  } finally {
    tplBatchBusy.value = false
  }
}

async function save() {
  if (!form.title.trim()) return ElMessage.warning('请填写标题')
  if (!tryBegin(saving)) return
  const wasCreate = !editingId.value
  try {
    const payload = buildPayload()
    if (editingId.value) {
      await http.patch(`/tasks/${editingId.value}`, payload)
      ElMessage.success('已保存并同步给孩子')
    } else {
      const created = await http.post('/tasks', payload)
      ElMessage.success('已发布')
      // 分栏：新建后切到刚发布任务的编辑态，便于继续改指派等
      if (useSplitEditor.value && created?.id) {
        editingId.value = created.id
        await load()
        const row = list.value.find((t) => t.id === created.id)
        if (row) openEdit(row)
        return
      }
    }
    if (useSplitEditor.value && !wasCreate) {
      await load()
      const row = list.value.find((t) => t.id === editingId.value)
      if (row) openEdit(row)
      return
    }
    dlg.value = false
    editingId.value = 0
    await load()
  } catch (e: any) {
    ElMessage.error(e.message)
  } finally {
    saving.value = false
  }
}

function openAssign(t: any) {
  batchAssignMode.value = false
  currentId.value = t.id
  assignIds.value = (t.assigns || []).map((a: any) => a.studentId)
  assignDlg.value = true
}

function openBatchAssign() {
  if (!selectedIds.value.length) return
  batchAssignMode.value = true
  currentId.value = 0
  // Intersection of current assignees as starting point; empty if none shared
  const rows = list.value.filter((t) => selectedIds.value.includes(t.id))
  if (!rows.length) return
  let common: number[] | null = null
  for (const t of rows) {
    const ids = (t.assigns || []).map((a: any) => a.studentId as number)
    if (common === null) common = ids
    else common = common.filter((id) => ids.includes(id))
  }
  assignIds.value = common || []
  assignDlg.value = true
}

async function doAssign() {
  batchBusy.value = true
  try {
    if (batchAssignMode.value) {
      const ids = [...selectedIds.value]
      let ok = 0
      const errors: string[] = []
      for (const id of ids) {
        try {
          await http.post(`/tasks/${id}/assign`, { studentIds: assignIds.value })
          ok++
        } catch (e: any) {
          errors.push(`#${id}: ${e.message || '失败'}`)
        }
      }
      assignDlg.value = false
      batchAssignMode.value = false
      if (ok) ElMessage.success(`已更新 ${ok} 个任务的指派`)
      if (errors.length) ElMessage.warning(`${errors.length} 个失败：${errors.slice(0, 2).join('；')}`)
      clearSelection()
      await load()
    } else {
      await http.post(`/tasks/${currentId.value}/assign`, { studentIds: assignIds.value })
      ElMessage.success('已更新指派')
      assignDlg.value = false
      await load()
    }
  } catch (e: any) {
    ElMessage.error(e.message || '指派失败')
  } finally {
    batchBusy.value = false
  }
}

function remove(t: any) {
  deletePrompt.taskId = t.id
  deletePrompt.message = buildDeleteTaskSoftMessage(t.title)
  deletePrompt.open = true
}

async function onDeleteConfirm() {
  const id = deletePrompt.taskId
  deletePrompt.open = false
  deletePrompt.taskId = 0
  if (!id) return
  try {
    await http.delete(`/tasks/${id}`)
    ElMessage.success('已删除')
    selectedIds.value = selectedIds.value.filter((x) => x !== id)
    await load()
  } catch (e: any) {
    if (e?.message) ElMessage.error(e.message)
  }
}

function batchRemove() {
  const ids = [...selectedIds.value]
  if (!ids.length) return
  batchPrompt.mode = 'remove'
  batchPrompt.ids = ids.map(String)
  batchPrompt.title = '批量删除'
  batchPrompt.message = `确定永久删除选中的 ${ids.length} 个任务？孩子将立刻看不到；历史打卡与积分记录会保留。`
  batchPrompt.confirmText = '删除'
  batchPrompt.open = true
}

async function runBatchRemove() {
  const ids = batchPrompt.ids.map(Number).filter((n) => n > 0)
  if (!ids.length) return
  batchBusy.value = true
  let ok = 0
  const errors: string[] = []
  try {
    for (const id of ids) {
      try {
        await http.delete(`/tasks/${id}`)
        ok++
      } catch (e: any) {
        errors.push(`#${id}: ${e.message || '失败'}`)
      }
    }
    if (ok) ElMessage.success(`已删除 ${ok} 个任务`)
    if (errors.length) ElMessage.warning(`${errors.length} 个失败：${errors.slice(0, 2).join('；')}`)
    clearSelection()
    await load()
  } finally {
    batchBusy.value = false
  }
}

async function onBatchPromptConfirm() {
  const mode = batchPrompt.mode
  batchPrompt.open = false
  if (mode === 'publish') await runBatchPublish()
  else if (mode === 'remove') await runBatchRemove()
  batchPrompt.mode = ''
  batchPrompt.ids = []
}

onMounted(async () => {
  await load()
  if (route.query.suggestTitle) openCreate()
  else if (route.query.focus === 'rotate') applyRouteFocus()
})
onActivated(() => {
  if (skipActivatedLoad) {
    skipActivatedLoad = false
    return
  }
  void load()
})

watch(
  () => [
    route.query.studentId,
    route.query.assignId,
    route.query.suggestTitle,
    route.query.suggestMicro,
    route.query.focus,
  ],
  () => {
    if (route.query.suggestTitle) openCreate()
    else if (route.query.focus === 'rotate' || list.value.length) applyRouteFocus()
  },
)
</script>

<style scoped>
.tasks-shell.is-split {
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(320px, 0.85fr);
  gap: 16px;
  align-items: start;
}
.tasks-main {
  min-width: 0;
}
.templates {
  margin-top: 12px;
  margin-bottom: 4px;
  padding-top: 12px;
  padding-bottom: 12px;
}
:deep(.task-row-active) {
  background: color-mix(in srgb, var(--accent, #3d8b6e) 10%, transparent) !important;
}
.tiny-hint {
  margin: 6px 0 0;
  font-size: 0.85rem;
  line-height: 1.4;
}
.templates-toggle {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  border: 0;
  background: transparent;
  padding: 4px 0;
  cursor: pointer;
  text-align: left;
  min-height: var(--tap-min);
}
.templates-toggle-main {
  display: flex;
  align-items: baseline;
  gap: 4px;
  flex-wrap: wrap;
}
.templates-chevron {
  flex-shrink: 0;
  font-size: 0.9rem;
}
.templates-peek {
  margin: 0 0 4px;
}
.templates-body {
  margin-top: 10px;
}
.cat-scroll {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  margin-bottom: 10px;
  padding-bottom: 2px;
}
.cat-row {
  display: inline-flex;
  flex-wrap: nowrap;
  white-space: nowrap;
}
.cat-row :deep(.el-radio-button) {
  flex-shrink: 0;
}
.tpl-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
  margin-bottom: 10px;
}
.template-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 8px;
}
.tpl-chip {
  display: flex;
  align-items: stretch;
  gap: 6px;
  border: 1px solid var(--line);
  background: #fff;
  border-radius: 12px;
  padding: 4px 6px 4px 10px;
  min-height: var(--tap-min);
}
.tpl-chip.selected {
  border-color: var(--accent);
  background: var(--accent-soft, #f0f7ff);
}
.tpl-check {
  flex-shrink: 0;
  margin-top: 10px;
}
.tpl-chip-main {
  flex: 1;
  min-width: 0;
  text-align: left;
  border: 0;
  background: transparent;
  padding: 8px 4px;
  cursor: pointer;
}
.tpl-chip-main:hover .tpl-title {
  color: var(--accent);
}
.tpl-more {
  flex-shrink: 0;
  align-self: center;
}
.tpl-title {
  display: block;
  font-weight: 700;
  margin-bottom: 4px;
}
.tpl-meta {
  font-size: 0.85rem;
}
.list-filter {
  margin-bottom: 4px;
}
.list-filter-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
}
.student-focus-row {
  margin-bottom: 8px;
}
.task-card-focus {
  border-color: color-mix(in srgb, var(--accent, #3d8b6e) 45%, var(--line));
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent, #3d8b6e) 18%, transparent);
}
.batch-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 4px;
}
.batch-count {
  font-weight: 600;
}
.batch-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.filter-empty {
  padding: 12px 4px 4px;
  font-size: 0.9rem;
}
.task-card {
  margin-bottom: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.task-card-main {
  display: flex;
  gap: 10px;
  align-items: flex-start;
}
.task-check {
  margin-top: 4px;
  flex-shrink: 0;
}
.task-card-body {
  flex: 1;
  min-width: 0;
}
.upgrade-hint {
  margin: 4px 0 0;
  color: #6b5a10;
  font-size: 0.82rem;
}
h3 {
  margin: 0 0 6px;
}
.density-hint {
  border-color: rgba(180, 140, 40, 0.28);
  background: linear-gradient(160deg, #fffef6 0%, #fff 85%);
}
.assigns {
  margin-top: 8px;
}
.actions {
  display: flex;
  gap: 8px;
}
.proposal-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: flex-start;
  justify-content: space-between;
  padding: 12px 0;
  border-bottom: 1px solid var(--line);
}
.proposal-row:last-child {
  border-bottom: 0;
}
.proposal-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
@media (min-width: 640px) {
  .template-grid {
    grid-template-columns: 1fr 1fr;
  }
}
@media (min-width: 768px) {
  .task-card {
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
  }
}
</style>
