<template>
  <div class="page">
    <PageSkeleton v-if="loading" :rows="4" />
    <template v-else>
    <div class="page-head">
      <h2 class="page-title" style="margin: 0">我的零花钱</h2>
    </div>

    <template v-if="!enabled">
      <EmptyState
        hero
        title="家庭还没打开零花钱账本"
        description="学迹积分愿望仍可用。想练真实用钱，请家长在「教育设置」里打开。"
        :action-label="DISABLED_ALLOWANCE_CTA.label"
        @action="$router.push(DISABLED_ALLOWANCE_CTA.path)"
      />
    </template>

    <template v-else>
      <div class="card-panel hero">
        <div class="muted">可用余额</div>
        <div class="stat-num">{{ formatYuan(balance) }}</div>
        <p class="muted tip">
          本周已花 {{ formatYuan(weekSpent) }}
          <template v-if="savePercent > 0"> · 建议先存约 {{ savePercent }}%</template>
          <template v-if="weekSaved > 0"> · 本周已存 {{ formatYuan(weekSaved) }}</template>
        </p>
        <p v-if="saveFirstHint" class="tip-strong">{{ saveFirstHint }}</p>
        <p v-if="note" class="muted tip">{{ note }}</p>
      </div>

      <div class="actions">
        <el-button type="primary" class="tap-btn" @click="openSpend">记一笔支出</el-button>
        <el-button class="tap-btn" @click="openGift">收到礼金</el-button>
        <el-button class="tap-btn" @click="openGoal">新目标</el-button>
      </div>

      <div
        v-if="actionEntries.length"
        class="card-panel pending-ledger"
        role="region"
        aria-label="待处理流水"
      >
        <h3>待我留意</h3>
        <div v-for="e in actionEntries" :key="e.id" class="entry-row">
          <div>
            <strong>{{ e.title }}</strong>
            <div class="muted">
              {{ kindLabel(e) }}
              <template v-if="e.category"> · {{ catLabel(e.category) }}</template>
              · {{ formatTime(e.createdAt) }}
            </div>
            <div v-if="e.status === 'pending'" class="pending-hint">等家长看看</div>
            <div v-if="e.status === 'rejected'" class="muted">
              先缓缓{{ e.reviewNote ? `：${e.reviewNote}` : '' }}
            </div>
          </div>
          <strong :class="e.deltaCents >= 0 ? 'plus' : 'minus'">
            {{ e.deltaCents >= 0 ? '+' : '' }}{{ formatYuan(e.deltaCents) }}
          </strong>
        </div>
      </div>

      <div class="card-panel">
        <h3>储蓄目标</h3>
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
              :stroke-width="12"
              color="var(--accent)"
            />
            <div class="muted">
              {{ formatYuan(g.savedCents) }} / {{ formatYuan(g.targetCents) }}
              <el-tag v-if="g.status === 'achieved'" size="small" type="success">达成</el-tag>
            </div>
          </div>
          <el-button
            v-if="g.status === 'active'"
            type="primary"
            class="tap-btn"
            @click="openSave(g)"
          >
            存一点
          </el-button>
        </div>
        <EmptyState
          v-if="!goals.length"
          title="还没有储蓄目标"
          description="想买的东西可以先存着，练一练延迟满足。"
        />
      </div>

      <el-collapse class="ledger-fold">
        <el-collapse-item name="ledger">
          <template #title>
            <span>最近流水{{ entries.length ? `（${entries.length}）` : '' }}</span>
          </template>
          <div v-for="e in entries" :key="e.id" class="entry-row">
            <div>
              <strong>{{ e.title }}</strong>
              <div class="muted">
                {{ kindLabel(e) }}
                <template v-if="e.category"> · {{ catLabel(e.category) }}</template>
                · {{ formatTime(e.createdAt) }}
              </div>
              <div v-if="e.status === 'pending'" class="pending-hint">等家长看看</div>
              <div v-if="e.status === 'rejected'" class="muted">
                先缓缓{{ e.reviewNote ? `：${e.reviewNote}` : '' }}
              </div>
            </div>
            <strong :class="e.deltaCents >= 0 ? 'plus' : 'minus'">
              {{ e.deltaCents >= 0 ? '+' : '' }}{{ formatYuan(e.deltaCents) }}
            </strong>
          </div>
          <EmptyState
            v-if="!entries.length"
            title="还没有流水"
            description="记一笔支出或等家长发零花钱。"
          />
        </el-collapse-item>
      </el-collapse>
    </template>

    <el-drawer
      v-model="spendDlg"
      title="记一笔支出"
      :direction="isPhone ? 'btt' : 'rtl'"
      :size="isPhone ? 'var(--drawer-phone)' : '400px'"
    >
      <el-form label-position="top">
        <el-form-item label="金额（元）">
          <el-input-number
            v-model="spendForm.yuan"
            :min="0.01"
            :max="100000"
            :step="1"
            :precision="2"
            size="large"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="分类">
          <div class="chips">
            <button
              v-for="c in categories"
              :key="c.value"
              type="button"
              class="chip"
              :class="{ on: spendForm.category === c.value }"
              @click="spendForm.category = c.value"
            >
              {{ c.label }}
            </button>
          </div>
        </el-form-item>
        <el-form-item label="说明">
          <el-input v-model="spendForm.title" maxlength="80" size="large" placeholder="买了什么" />
        </el-form-item>
        <el-button
          type="primary"
          class="tap-btn full-tap"
          :loading="submitting"
          @click="submitSpend"
        >
          记上
        </el-button>
        <p v-if="largeHint" class="muted tip">{{ largeHint }}</p>
      </el-form>
    </el-drawer>

    <el-drawer
      v-model="giftDlg"
      title="收到礼金"
      :direction="isPhone ? 'btt' : 'rtl'"
      :size="isPhone ? 'var(--drawer-phone)' : '400px'"
    >
      <el-form label-position="top">
        <el-form-item label="金额（元）">
          <el-input-number
            v-model="giftForm.yuan"
            :min="0.01"
            :max="100000"
            :step="1"
            :precision="2"
            size="large"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="说明">
          <el-input
            v-model="giftForm.title"
            maxlength="80"
            size="large"
            placeholder="例如：压岁钱、亲戚给的"
          />
        </el-form-item>
        <el-button
          type="primary"
          class="tap-btn full-tap"
          :loading="submitting"
          @click="submitGift"
        >
          记上
        </el-button>
      </el-form>
    </el-drawer>

    <el-drawer
      v-model="goalDlg"
      title="新储蓄目标"
      :direction="isPhone ? 'btt' : 'rtl'"
      :size="isPhone ? 'var(--drawer-phone)' : '400px'"
    >
      <el-form label-position="top">
        <el-form-item label="想存什么">
          <el-input v-model="goalForm.title" maxlength="80" size="large" />
        </el-form-item>
        <el-form-item label="目标金额（元）">
          <el-input-number
            v-model="goalForm.yuan"
            :min="1"
            :max="100000"
            :step="10"
            :precision="2"
            size="large"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="封面（可选）">
          <div class="cover-pick">
            <el-upload
              :show-file-list="false"
              :disabled="uploadingCover"
              accept="image/jpeg,image/png,image/webp,image/gif"
              :http-request="uploadCover"
            >
              <el-button class="tap-btn" :loading="uploadingCover">
                {{ goalForm.coverUrl ? '换一张' : '选照片' }}
              </el-button>
            </el-upload>
            <el-button
              v-if="goalForm.coverUrl"
              text
              type="danger"
              :disabled="uploadingCover"
              @click="goalForm.coverUrl = ''"
            >
              去掉
            </el-button>
          </div>
          <img
            v-if="goalForm.coverUrl"
            :src="goalForm.coverUrl"
            class="cover-preview"
            alt="目标封面预览"
          />
          <p class="muted tiny-hint">一张小图提醒自己在为谁存；可不选。</p>
        </el-form-item>
        <el-button
          type="primary"
          class="tap-btn full-tap"
          :loading="submitting"
          @click="submitGoal"
        >
          创建目标
        </el-button>
      </el-form>
    </el-drawer>

    <SoftPrompt
      v-model="savePrompt"
      title="存一点到目标"
      :message="saveTarget ? `往「${saveTarget.title}」存` : ''"
      placeholder="金额（元），例如 5"
      confirm-text="存入"
      require-note
      hint="写要存的金额，例如 5"
      :kid-mode="true"
      @confirm="confirmSave"
    />
    <SoftPrompt
      v-model="worthPrompt"
      title="这笔花得值吗？"
      message="想一想就好，不写也完全没关系。练的是慢慢做决定。"
      placeholder="例如：有点贵，下次先存目标"
      confirm-text="记下想法"
      cancel-text="跳过"
      :require-note="false"
      :kid-mode="true"
      hint=""
      :templates="worthTemplates"
      @confirm="onWorthConfirm"
      @cancel="worthPrompt = false"
    />
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
import { DISABLED_ALLOWANCE_CTA } from '../../composables/studentMoreEmpty'
import { friendlyError } from '../../composables/useOnboarding'
import { useBreakpoint } from '../../composables/useBreakpoint'
import {
  CompressImageError,
  compressImageForUpload,
} from '../../composables/compressImage'
import {
  ALLOWANCE_CATEGORY_LABELS,
  ALLOWANCE_KIND_LABELS,
  formatYuan,
  yuanToCents,
} from '../../composables/money'
import { createLoadGate, tryBegin } from '../../composables/asyncGuard'

const { isPhone } = useBreakpoint()
const loading = ref(true)
const allowanceLoadGate = createLoadGate()
const enabled = ref(false)
const balance = ref(0)
const weekSpent = ref(0)
const weekSaved = ref(0)
const savePercent = ref(0)
const saveFirstHint = ref('')
const note = ref('')
const largeCents = ref(5000)
const entries = ref<any[]>([])
const actionEntries = computed(() =>
  entries.value.filter((e) => e.status === 'pending' || e.status === 'rejected'),
)
const goals = ref<any[]>([])
const submitting = ref(false)
const uploadingCover = ref(false)

const spendDlg = ref(false)
const giftDlg = ref(false)
const goalDlg = ref(false)
const savePrompt = ref(false)
const saveTarget = ref<any>(null)
const worthPrompt = ref(false)
const worthTemplates = ['挺值的，开心', '有点贵，下次先存目标', '和爸妈商量过再买更好']

const categories = Object.entries(ALLOWANCE_CATEGORY_LABELS)
  .filter(([k]) => k !== 'save')
  .map(([value, label]) => ({ value, label }))

const spendForm = reactive({
  yuan: 10,
  category: 'snack',
  title: '',
})
const giftForm = reactive({ yuan: 50, title: '收到礼金' })
const goalForm = reactive({ title: '', yuan: 30, coverUrl: '' })

const largeHint = computed(() => {
  const cents = yuanToCents(spendForm.yuan)
  if (cents >= largeCents.value) {
    return `这笔 ≥ ${formatYuan(largeCents.value)}，提交后会等家长看一眼，先不扣余额。`
  }
  return ''
})

function goalPct(g: any) {
  if (!g.targetCents) return 0
  return Math.min(100, Math.round((g.savedCents / g.targetCents) * 100))
}

function kindLabel(e: any) {
  return ALLOWANCE_KIND_LABELS[e.kind] || e.kind
}
function catLabel(c: string) {
  return ALLOWANCE_CATEGORY_LABELS[c] || c
}
function formatTime(v: string) {
  if (!v) return ''
  const d = new Date(v)
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

async function load() {
  const ticket = allowanceLoadGate.next()
  loading.value = true
  try {
    const res: any = await http.get('/allowance/me')
    if (!ticket.isCurrent()) return
    enabled.value = !!res.enabled
    if (!res.enabled) return
    balance.value = res.account?.balanceCents ?? 0
    weekSpent.value = res.weekSpentCents ?? 0
    weekSaved.value = res.weekSavedCents ?? 0
    savePercent.value = res.allowanceSavePercent ?? 0
    saveFirstHint.value = res.saveFirstHint || ''
    note.value = res.allowanceNote || ''
    largeCents.value = res.allowanceLargeCents ?? 5000
    entries.value = res.entries || []
    goals.value = res.goals || []
  } catch (e: any) {
    if (!ticket.isCurrent()) return
    ElMessage.error(friendlyError(e, '账本暂时打不开'))
  } finally {
    if (ticket.isCurrent()) loading.value = false
  }
}

function openSpend() {
  spendForm.yuan = 10
  spendForm.category = 'snack'
  spendForm.title = ''
  spendDlg.value = true
}
function openGift() {
  giftForm.yuan = 50
  giftForm.title = '收到礼金'
  giftDlg.value = true
}
function openGoal() {
  goalForm.title = ''
  goalForm.yuan = 30
  goalForm.coverUrl = ''
  goalDlg.value = true
}
function openSave(g: any) {
  saveTarget.value = g
  savePrompt.value = true
}

async function submitSpend() {
  const amountCents = yuanToCents(spendForm.yuan)
  if (amountCents < 1) return ElMessage.warning('请填写金额')
  const title = spendForm.title.trim() || catLabel(spendForm.category)
  if (!tryBegin(submitting)) return
  try {
    const res: any = await http.post('/allowance/entries', {
      kind: 'spend',
      amountCents,
      category: spendForm.category,
      title,
    })
    spendDlg.value = false
    ElMessage.success(res.pending ? '这笔稍大，等家长看一眼' : '已记下')
    if (!res.pending) worthPrompt.value = true
    await load()
  } catch (e: any) {
    ElMessage.error(friendlyError(e, '没记上'))
  } finally {
    submitting.value = false
  }
}

function onWorthConfirm(note: string) {
  worthPrompt.value = false
  if (note.trim()) {
    ElMessage.success('想法已记下，慢慢就会更会花钱')
  }
}

async function submitGift() {
  const amountCents = yuanToCents(giftForm.yuan)
  if (amountCents < 1) return ElMessage.warning('请填写金额')
  if (!tryBegin(submitting)) return
  try {
    await http.post('/allowance/entries', {
      kind: 'gift_in',
      amountCents,
      title: giftForm.title.trim() || '收到礼金',
    })
    giftDlg.value = false
    ElMessage.success('已记上')
    await load()
  } catch (e: any) {
    ElMessage.error(friendlyError(e, '没记上'))
  } finally {
    submitting.value = false
  }
}

async function uploadCover(option: any) {
  if (!tryBegin(uploadingCover)) return
  try {
    const raw = option.file as File
    const file = await compressImageForUpload(raw)
    const fd = new FormData()
    fd.append('file', file)
    const res: any = await http.post('/uploads', fd)
    goalForm.coverUrl = res.url
    ElMessage.success('封面已上传')
  } catch (e: any) {
    const msg =
      e instanceof CompressImageError
        ? e.message
        : friendlyError(e, '封面没传上去，换一张或稍后再试')
    ElMessage.error(msg)
  } finally {
    uploadingCover.value = false
  }
}

async function submitGoal() {
  if (!goalForm.title.trim()) return ElMessage.warning('写一下想存什么')
  if (!tryBegin(submitting)) return
  try {
    const body: Record<string, unknown> = {
      title: goalForm.title.trim(),
      targetCents: yuanToCents(goalForm.yuan),
    }
    if (goalForm.coverUrl) body.coverUrl = goalForm.coverUrl
    await http.post('/allowance/goals', body)
    goalDlg.value = false
    goalForm.title = ''
    goalForm.coverUrl = ''
    ElMessage.success('目标已创建')
    await load()
  } catch (e: any) {
    ElMessage.error(friendlyError(e, '没创建成功'))
  } finally {
    submitting.value = false
  }
}

async function confirmSave(noteText: string) {
  const yuan = Number(String(noteText).replace(/[^\d.]/g, ''))
  const amountCents = yuanToCents(yuan)
  if (!saveTarget.value || amountCents < 1) {
    ElMessage.warning('请写金额，例如 5')
    return
  }
  try {
    const res: any = await http.post(`/allowance/goals/${saveTarget.value.id}/save`, {
      amountCents,
    })
    ElMessage.success(res.achieved ? '目标达成！可以和爸妈一起兑现购买' : '已存入')
    await load()
  } catch (e: any) {
    ElMessage.error(friendlyError(e, '没存上'))
  }
}

onMounted(load)
</script>

<style scoped>
.hero .stat-num {
  font-size: 2.2rem;
  font-family: var(--font-display);
  margin: 4px 0 8px;
}
.ledger-fold {
  margin-top: 4px;
}
.ledger-fold :deep(.el-collapse-item__header) {
  font-family: var(--font-display);
  font-size: 1.05rem;
}
.tip {
  margin: 4px 0 0;
  font-size: 0.9rem;
}
.tip-strong {
  margin: 6px 0 0;
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--accent-strong, #b45309);
}
.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 14px;
}
h3 {
  margin: 0 0 12px;
  font-family: var(--font-display);
}
.goal-row,
.entry-row {
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
.cover-pick {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}
.cover-preview {
  display: block;
  margin-top: 10px;
  width: 100%;
  max-height: 160px;
  object-fit: cover;
  border-radius: 10px;
  background: var(--surface-muted, #f3f0ea);
}
.tiny-hint {
  margin: 8px 0 0;
  font-size: 0.85rem;
}
.plus {
  color: var(--ok, #2a9d6e);
}
.minus {
  color: var(--danger, #c45c4a);
}
.pending-hint {
  color: var(--warn, #c4892a);
  font-size: 0.88rem;
  margin-top: 2px;
}
.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.chip {
  border: 1px solid var(--line);
  background: transparent;
  border-radius: 10px;
  padding: 8px 12px;
  min-height: var(--tap-min);
  cursor: pointer;
  font: inherit;
}
.chip.on {
  border-color: var(--accent);
  background: color-mix(in srgb, var(--accent) 12%, transparent);
}
.full-tap {
  width: 100%;
  margin-top: 8px;
}
</style>
