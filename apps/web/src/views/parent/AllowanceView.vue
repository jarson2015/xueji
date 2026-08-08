<template>
  <div class="page">
    <PageSkeleton v-if="loading" :rows="4" />
    <template v-else>
    <div class="page-head">
      <h2 class="page-title" style="margin: 0">孩子零花钱</h2>
      <el-select
        v-if="students.length"
        v-model="studentId"
        size="large"
        style="min-width: 140px"
        @change="load"
      >
        <el-option v-for="s in students" :key="s.id" :label="s.name" :value="s.id" />
      </el-select>
    </div>

    <p class="lead muted">
      零花钱和学迹积分是两套：积分换愿望，零花钱练真实用钱。不会互相兑换。
    </p>

    <template v-if="!enabled">
      <EmptyState
        hero
        title="还没打开零花钱账本"
        description="在「教育设置」里打开开关后，孩子才能记账。"
        action-label="去教育设置打开"
        @action="$router.push('/parent/family-edu')"
      />
    </template>

    <template v-else>
      <div class="card-panel hero">
        <div class="muted">{{ studentName }} · 可用余额</div>
        <div class="stat-num">{{ formatYuan(balance) }}</div>
        <p class="muted tip">
          待确认 {{ pending.length }} 笔
          <template v-if="weeklyCents">
            · 建议每周 {{ formatYuan(weeklyCents) }}
          </template>
          <template v-if="savePercent > 0">
            · 先存 {{ savePercent }}%
          </template>
        </p>
        <p v-if="saveFirstHint" class="muted tip">{{ saveFirstHint }}</p>
      </div>

      <div class="card-panel" v-if="pending.length">
        <h3>
          待确认
          <el-tag type="warning" size="small">{{ pending.length }}</el-tag>
        </h3>
        <div v-for="e in pending" :key="e.id" class="entry-row pending">
          <div>
            <strong>{{ e.title }}</strong>
            <div class="muted">
              {{ formatYuan(e.deltaCents) }} · {{ formatTime(e.createdAt) }}
            </div>
          </div>
          <div class="row-actions">
            <el-button type="primary" class="tap-btn" @click="review(e, 'approve')">
              同意入账
            </el-button>
            <el-button class="tap-btn" @click="openReject(e)">先缓缓</el-button>
          </div>
        </div>
      </div>

      <div class="card-panel">
        <h3>流水</h3>
        <div v-for="e in entries" :key="e.id" class="entry-row">
          <div>
            <strong>{{ e.title }}</strong>
            <div class="muted">
              {{ kindLabel(e.kind) }}
              <template v-if="e.status === 'pending'"> · 待确认</template>
              <template v-else-if="e.status === 'rejected'"> · 已缓缓</template>
              · {{ formatTime(e.createdAt) }}
            </div>
          </div>
          <strong :class="e.deltaCents >= 0 ? 'plus' : 'minus'">
            {{ e.deltaCents >= 0 ? '+' : '' }}{{ formatYuan(e.deltaCents) }}
          </strong>
        </div>
        <div v-if="!entries.length" class="muted">还没有流水</div>
      </div>

      <el-collapse class="history-fold">
        <el-collapse-item name="income-goals">
          <template #title>
            <span>入账与目标</span>
          </template>
          <div class="fold-block">
            <h3>快捷入账</h3>
            <div class="actions">
              <el-button
                type="primary"
                class="tap-btn"
                :disabled="!weeklyCents"
                :loading="submitting"
                @click="giveWeekly"
              >
                发本周零花钱
                <template v-if="weeklyCents">（{{ formatYuan(weeklyCents) }}）</template>
              </el-button>
              <el-button class="tap-btn" @click="incomeDlg = true">记一笔收入</el-button>
              <el-button
                v-if="achievementBonusEnabled"
                class="tap-btn"
                @click="openAchievement"
              >
                登记成就奖金
              </el-button>
            </div>
            <p v-if="!weeklyCents" class="muted tip">
              可在「教育设置」填写建议每周零花钱金额。
            </p>
            <p v-if="!achievementBonusEnabled" class="muted tip">
              成就奖金默认关闭；可在教育设置「零花钱约定」中开启。
            </p>
          </div>
          <div class="fold-block">
            <h3>储蓄目标（只读）</h3>
            <div v-for="g in goals" :key="g.id" class="goal-row">
              <img
                v-if="g.coverUrl"
                :src="g.coverUrl"
                class="goal-cover"
                alt=""
              />
              <div class="goal-main">
                <strong>{{ g.title }}</strong>
                <el-progress
                  :percentage="goalPct(g)"
                  :stroke-width="10"
                  color="var(--accent)"
                />
                <div class="muted">
                  {{ formatYuan(g.savedCents) }} / {{ formatYuan(g.targetCents) }}
                </div>
              </div>
            </div>
            <div v-if="!goals.length" class="muted">孩子还没设目标</div>
          </div>
        </el-collapse-item>
      </el-collapse>
    </template>

    <el-drawer
      v-model="incomeDlg"
      title="记一笔收入"
      :direction="isPhone ? 'btt' : 'rtl'"
      :size="isPhone ? 'var(--drawer-phone)' : '400px'"
    >
      <el-form label-position="top">
        <el-form-item label="类型">
          <el-select v-model="incomeForm.kind" size="large" style="width: 100%">
            <el-option label="零花钱" value="pocket_money" />
            <el-option label="额外奖励" value="bonus" />
            <el-option label="礼金等" value="gift_in" />
            <el-option label="校正（加）" value="adjust" />
          </el-select>
        </el-form-item>
        <el-form-item label="金额（元）">
          <el-input-number
            v-model="incomeForm.yuan"
            :min="0.01"
            :max="100000"
            :step="1"
            :precision="2"
            size="large"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="说明">
          <el-input v-model="incomeForm.title" maxlength="80" size="large" />
        </el-form-item>
        <el-button
          type="primary"
          class="tap-btn full-tap"
          :loading="submitting"
          @click="submitIncome"
        >
          入账
        </el-button>
      </el-form>
    </el-drawer>

    <SoftPrompt
      v-model="rejectPrompt"
      title="先缓缓这笔支出"
      message="写一句短评，让孩子知道为什么，沟通优先。"
      placeholder="例如：我们先商量一下要不要买"
      confirm-text="发给孩子"
      require-note
      :templates="rejectTemplates"
      @confirm="confirmReject"
    />
    <SoftPrompt
      v-model="achievementPrompt"
      title="登记成就奖金？"
      :message="achievementConfirmMsg"
      confirm-text="确认入账"
      cancel-text="再想想"
      :show-input="false"
      @confirm="submitAchievement"
    />
    <el-drawer
      v-model="achievementDlg"
      title="登记成就奖金"
      :direction="isPhone ? 'btt' : 'rtl'"
      :size="isPhone ? 'var(--drawer-phone)' : '400px'"
    >
      <p class="muted tip">
        进零花钱，不加任务积分。适合偶尔的额外奖励，不适合每次打卡。
      </p>
      <el-form label-position="top">
        <el-form-item label="成就标题">
          <el-input v-model="achievementForm.title" maxlength="80" size="large" placeholder="如：期中数学进步" />
        </el-form-item>
        <el-form-item label="金额（元）">
          <el-input-number
            v-model="achievementForm.yuan"
            :min="0.01"
            :max="achievementMaxYuan"
            :step="1"
            :precision="2"
            size="large"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="备注（可选）">
          <el-input v-model="achievementForm.note" maxlength="200" size="large" />
        </el-form-item>
        <el-button
          type="primary"
          class="tap-btn full-tap"
          :loading="submitting"
          @click="achievementPrompt = true"
        >
          下一步确认
        </el-button>
      </el-form>
    </el-drawer>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import http from '../../api/http'
import EmptyState from '../../components/EmptyState.vue'
import PageSkeleton from '../../components/PageSkeleton.vue'
import SoftPrompt from '../../components/SoftPrompt.vue'
import { friendlyError } from '../../composables/useOnboarding'
import { useBreakpoint } from '../../composables/useBreakpoint'
import {
  ALLOWANCE_KIND_LABELS,
  formatYuan,
  yuanToCents,
} from '../../composables/money'
import { createLoadGate, tryBegin } from '../../composables/asyncGuard'

const { isPhone } = useBreakpoint()
const loading = ref(true)
const allowanceLoadGate = createLoadGate()
const students = ref<any[]>([])
const studentId = ref<number | null>(null)
const enabled = ref(false)
const balance = ref(0)
const weeklyCents = ref<number | null>(null)
const savePercent = ref(0)
const saveFirstHint = ref('')
const entries = ref<any[]>([])
const goals = ref<any[]>([])
const submitting = ref(false)
const incomeDlg = ref(false)
const rejectPrompt = ref(false)
const rejectTarget = ref<any>(null)
const reconcilePrompt = ref(false)
const achievementBonusEnabled = ref(false)
const achievementMaxYuan = ref(200)
const achievementDlg = ref(false)
const achievementPrompt = ref(false)
const achievementForm = reactive({
  title: '',
  yuan: 20,
  note: '',
})
const achievementConfirmMsg = computed(
  () =>
    `将给「${studentName.value}」发放成就奖金 ${formatYuan(yuanToCents(achievementForm.yuan))}（${achievementForm.title || '未填标题'}）。只进零花钱，不加任务积分。`,
)

const incomeForm = reactive({
  kind: 'pocket_money',
  yuan: 50,
  title: '本周零花钱',
})

const rejectTemplates = [
  '我们先商量一下要不要买',
  '这笔稍大，周末一起看看',
  '先把目标存满再考虑',
]

const studentName = computed(
  () => students.value.find((s) => s.id === studentId.value)?.name || '孩子',
)
const pending = computed(() =>
  entries.value.filter((e) => e.status === 'pending'),
)

function goalPct(g: any) {
  if (!g.targetCents) return 0
  return Math.min(100, Math.round((g.savedCents / g.targetCents) * 100))
}
function kindLabel(k: string) {
  return ALLOWANCE_KIND_LABELS[k] || k
}
function formatTime(v: string) {
  if (!v) return ''
  const d = new Date(v)
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

async function loadStudents() {
  students.value = (await http.get('/students')) as any[]
  if (!studentId.value && students.value.length) {
    studentId.value = students.value[0].id
  }
}

async function load() {
  if (!studentId.value) return
  const ticket = allowanceLoadGate.next()
  loading.value = true
  try {
    const res: any = await http.get(`/allowance/students/${studentId.value}`)
    if (!ticket.isCurrent()) return
    enabled.value = !!res.enabled
    if (!res.enabled) {
      entries.value = []
      goals.value = []
      balance.value = 0
      return
    }
    balance.value = res.account?.balanceCents ?? 0
    weeklyCents.value = res.allowanceWeeklyCents ?? null
    savePercent.value = res.allowanceSavePercent ?? 0
    achievementBonusEnabled.value = !!res.allowanceAchievementBonusEnabled
    achievementMaxYuan.value =
      (res.allowanceAchievementBonusMaxCents ?? 20000) / 100
    saveFirstHint.value = res.saveFirstOk
      ? ''
      : res.saveFirstHint || ''
    entries.value = res.entries || []
    goals.value = res.goals || []
  } catch (e: any) {
    if (!ticket.isCurrent()) return
    ElMessage.error(friendlyError(e, '账本暂时打不开'))
  } finally {
    if (ticket.isCurrent()) loading.value = false
  }
}

function openAchievement() {
  achievementForm.title = ''
  achievementForm.yuan = Math.min(20, achievementMaxYuan.value)
  achievementForm.note = ''
  achievementDlg.value = true
}

async function submitAchievement() {
  achievementPrompt.value = false
  if (!studentId.value || !achievementForm.title.trim()) {
    ElMessage.warning('请填写成就标题')
    return
  }
  if (!tryBegin(submitting)) return
  try {
    const draft: any = await http.post('/allowance/achievements', {
      studentId: studentId.value,
      title: achievementForm.title.trim(),
      note: achievementForm.note.trim() || undefined,
      amountCents: yuanToCents(achievementForm.yuan),
    })
    await http.post(`/allowance/achievements/${draft.id}/post`)
    ElMessage.success('成就奖金已入账')
    achievementDlg.value = false
    await load()
  } catch (e: any) {
    ElMessage.error(friendlyError(e, '入账没成功'))
  } finally {
    submitting.value = false
  }
}

async function giveWeekly() {
  if (!studentId.value || !weeklyCents.value) return
  if (!tryBegin(submitting)) return
  try {
    await http.post('/allowance/entries', {
      studentId: studentId.value,
      kind: 'pocket_money',
      amountCents: weeklyCents.value,
      title: '本周零花钱',
    })
    ElMessage.success('已发给孩子')
    await load()
  } catch (e: any) {
    ElMessage.error(friendlyError(e, '没发出去'))
  } finally {
    submitting.value = false
  }
}

async function submitIncome() {
  if (!studentId.value) return
  const amountCents = yuanToCents(incomeForm.yuan)
  if (amountCents < 1) return ElMessage.warning('请填写金额')
  if (!tryBegin(submitting)) return
  try {
    await http.post('/allowance/entries', {
      studentId: studentId.value,
      kind: incomeForm.kind,
      amountCents,
      title: incomeForm.title.trim() || '入账',
    })
    incomeDlg.value = false
    ElMessage.success('已入账')
    await load()
  } catch (e: any) {
    ElMessage.error(friendlyError(e, '没入账'))
  } finally {
    submitting.value = false
  }
}

async function review(e: any, action: 'approve' | 'reject', note?: string) {
  try {
    await http.post(`/allowance/entries/${e.id}/review`, { action, note })
    ElMessage.success(action === 'approve' ? '已同意入账' : '已告诉孩子先缓缓')
    if (action === 'reject') reconcilePrompt.value = true
    await load()
  } catch (err: any) {
    ElMessage.error(friendlyError(err, '没处理成功'))
  }
}

function openReject(e: any) {
  rejectTarget.value = e
  rejectPrompt.value = true
}

async function confirmReject(note: string) {
  if (!rejectTarget.value) return
  await review(rejectTarget.value, 'reject', note)
}

onMounted(async () => {
  try {
    await loadStudents()
    await load()
  } catch (e: any) {
    ElMessage.error(friendlyError(e, '加载失败'))
    loading.value = false
  }
})
</script>

<style scoped>
.lead {
  margin: -4px 0 14px;
}
.hero .stat-num {
  font-size: 2rem;
  font-family: var(--font-display);
  margin: 4px 0 8px;
}
.tip {
  margin: 4px 0 0;
  font-size: 0.9rem;
}
h3 {
  margin: 0 0 12px;
  font-family: var(--font-display);
}
.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.entry-row,
.goal-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px dashed var(--line);
}
.goal-main {
  flex: 1;
  min-width: 0;
}
.goal-cover {
  width: 48px;
  height: 48px;
  object-fit: cover;
  border-radius: 8px;
  flex-shrink: 0;
  background: var(--surface-muted, #f3f0ea);
}
.entry-row.pending {
  flex-wrap: wrap;
}
.row-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.plus {
  color: var(--ok, #2a9d6e);
}
.minus {
  color: var(--danger, #c45c4a);
}
.full-tap {
  width: 100%;
  margin-top: 8px;
}
.history-fold {
  margin-bottom: 16px;
  border: none;
}
.history-fold :deep(.el-collapse-item__header) {
  font-weight: 600;
  font-size: 1rem;
}
.fold-block {
  padding: 8px 0 14px;
  border-bottom: 1px dashed var(--line);
}
.fold-block:last-child {
  border-bottom: none;
  padding-bottom: 0;
}
</style>
