<template>
  <div class="page">
    <PageSkeleton v-if="loading" :rows="4" />
    <template v-else>
      <div class="page-head">
        <div>
          <h2 class="page-title" style="margin: 0">积分约定</h2>
          <p class="muted tiny intro-line">借用要还回；赠予分享心意。积分不是钱。</p>
        </div>
        <el-button
          v-if="enabled && siblings.length"
          type="primary"
          class="tap-btn"
          @click="openCompose()"
        >
          发起
        </el-button>
      </div>

      <EmptyState
        v-if="!enabled"
        hero
        title="家庭暂未开启积分约定与赠予"
        description="可以按约定暂时借用，或自愿赠予心意。积分不是钱。请家长在「教育设置」里打开。"
        :action-label="DISABLED_PACTS_CTA.label"
        @action="$router.push(DISABLED_PACTS_CTA.path)"
      />

      <template v-else>
        <el-collapse v-if="config.pointsPactNote" class="intro-fold">
          <el-collapse-item title="家庭说明" name="note">
            <p class="muted tiny note">{{ config.pointsPactNote }}</p>
          </el-collapse-item>
        </el-collapse>

        <div
          v-if="pendingAsLender.length || pendingGiftsToMe.length"
          ref="acceptSection"
          class="card-panel pending-panel"
          :class="{ 'focus-ring': focusMode === 'accept' }"
        >
          <h3 class="pending-title">
            待我处理
            <el-tag type="warning" size="small">
              {{ pendingAsLender.length + pendingGiftsToMe.length }}
            </el-tag>
          </h3>
          <p class="pending-sub muted tiny">有人找你借出或赠予，先处理这些。</p>

          <div v-for="p in pendingAsLender" :key="'lend-' + p.id" class="pact-row">
            <div>
              <el-tag size="small" type="info" effect="plain">借用</el-tag>
              <div style="margin-top: 6px">
                <strong>{{ p.borrowerName }}</strong>
                想借用 <strong>{{ p.amountPoints }}</strong> 积分
              </div>
              <div class="muted tiny">约定还回日 {{ p.dueDate }}</div>
              <div v-if="p.note" class="muted tiny">{{ p.note }}</div>
            </div>
            <div class="row-actions">
              <el-button
                type="primary"
                class="tap-btn"
                :loading="actingId === p.id"
                @click="accept(p)"
              >
                同意借出
              </el-button>
              <el-button class="tap-btn" :disabled="actingId === p.id" @click="reject(p)">
                婉拒
              </el-button>
            </div>
          </div>

          <div v-for="g in pendingGiftsToMe" :key="'gift-' + g.id" class="pact-row">
            <div>
              <el-tag size="small" type="success" effect="plain">赠予</el-tag>
              <div style="margin-top: 6px">
                <strong>{{ g.fromName }}</strong>
                想赠予你 <strong>{{ g.amountPoints }}</strong> 积分
              </div>
              <div class="muted tiny">{{ reasonLabel(g.reasonCode) }}</div>
              <div v-if="g.note" class="muted tiny">{{ g.note }}</div>
            </div>
            <div class="row-actions">
              <el-button
                type="primary"
                class="tap-btn"
                :loading="actingId === g.id"
                @click="acceptGift(g)"
              >
                收下
              </el-button>
              <el-button
                class="tap-btn"
                :disabled="actingId === g.id"
                @click="rejectGift(g)"
              >
                婉拒
              </el-button>
            </div>
          </div>
        </div>

        <div class="mode-tabs">
          <button
            type="button"
            class="mode-tab"
            :class="{ active: mode === 'lend' }"
            @click="mode = 'lend'"
          >
            借用
          </button>
          <button
            type="button"
            class="mode-tab"
            :class="{ active: mode === 'gift' }"
            @click="mode = 'gift'"
          >
            赠予
          </button>
        </div>

        <!-- 借用列表 -->
        <template v-if="mode === 'lend'">
          <div ref="listSection" class="card-panel">
            <h3>我的借用约定</h3>
            <EmptyState
              v-if="!items.length"
              title="还没有借用约定"
              description="点右上角「发起」，或等兄弟姐妹找你借用后，会出现在这里。"
            />
            <div
              v-for="p in items"
              :key="p.id"
              class="pact-row"
              :class="{ 'focus-row': isFocusedPact(p) }"
              :data-pact-id="p.id"
            >
              <div>
                <el-tag size="small" type="info" effect="plain">借用</el-tag>
                <el-tag size="small" :type="statusType(p.status)" style="margin-left: 6px">
                  {{ statusLabel(p.status) }}
                </el-tag>
                <div style="margin-top: 6px">
                  <template v-if="p.borrowerId === myId">
                    向 <strong>{{ p.lenderName }}</strong> 借用
                    <strong>{{ p.amountPoints }}</strong> 积分
                  </template>
                  <template v-else>
                    借给 <strong>{{ p.borrowerName }}</strong>
                    <strong>{{ p.amountPoints }}</strong> 积分
                  </template>
                </div>
                <div class="muted tiny">约定还回日 {{ p.dueDate }}</div>
                <div v-if="p.status === 'active' && p.overdueExtraDue" class="warn tiny">
                  已过约定日 {{ p.overdueDays }} 天，需多还 {{ p.overdueExtraDue }} 积分（上限
                  {{ p.maxOverdueExtra }}）· 合计还回 {{ p.amountDue }} 积分
                </div>
                <div v-else-if="p.status === 'active'" class="muted tiny">
                  按时还回即可 · 应还 {{ p.amountDue }} 积分
                </div>
              </div>
              <div class="row-actions">
                <el-button
                  v-if="
                    (p.status === 'pending' || p.status === 'parent_pending') &&
                    (p.borrowerId === myId ||
                      (p.status === 'pending' && p.lenderId === myId))
                  "
                  class="tap-btn"
                  @click="cancel(p)"
                >
                  取消
                </el-button>
                <el-button
                  v-if="p.status === 'active' && p.borrowerId === myId"
                  type="primary"
                  class="tap-btn"
                  :loading="actingId === p.id"
                  @click="repay(p)"
                >
                  按约定还回
                </el-button>
              </div>
            </div>
          </div>
        </template>

        <!-- 赠予列表 -->
        <template v-else>
          <div class="card-panel">
            <h3>我的赠予</h3>
            <EmptyState
              v-if="!giftItems.length"
              title="还没有赠予记录"
              description="点右上角「发起」，或等家人赠予你后，会出现在这里。"
            />
            <div v-for="g in giftItems" :key="g.id" class="pact-row">
              <div>
                <el-tag size="small" type="success" effect="plain">赠予</el-tag>
                <el-tag
                  size="small"
                  :type="giftStatusType(g.status)"
                  style="margin-left: 6px"
                >
                  {{ giftStatusLabel(g.status) }}
                </el-tag>
                <div style="margin-top: 6px">
                  <template v-if="g.fromStudentId === myId">
                    送给 <strong>{{ g.toName }}</strong>
                    <strong>{{ g.amountPoints }}</strong> 积分
                  </template>
                  <template v-else>
                    <strong>{{ g.fromName }}</strong> 送给你
                    <strong>{{ g.amountPoints }}</strong> 积分
                  </template>
                </div>
                <div class="muted tiny">{{ reasonLabel(g.reasonCode) }}</div>
                <div v-if="g.note" class="muted tiny">{{ g.note }}</div>
              </div>
              <div class="row-actions">
                <el-button
                  v-if="
                    g.fromStudentId === myId &&
                    (g.status === 'pending' || g.status === 'parent_pending')
                  "
                  class="tap-btn"
                  @click="cancelGift(g)"
                >
                  取消
                </el-button>
              </div>
            </div>
          </div>
        </template>
      </template>

      <el-drawer
        v-model="composeOpen"
        :title="composeMode === 'lend' ? '发起借用' : '发起赠予'"
        :direction="isPhone ? 'btt' : 'rtl'"
        :size="isPhone ? 'var(--drawer-phone)' : '400px'"
      >
        <div class="mode-tabs" style="margin-bottom: 16px">
          <button
            type="button"
            class="mode-tab"
            :class="{ active: composeMode === 'lend' }"
            @click="composeMode = 'lend'"
          >
            借用
          </button>
          <button
            type="button"
            class="mode-tab"
            :class="{ active: composeMode === 'gift' }"
            @click="composeMode = 'gift'"
          >
            赠予
          </button>
        </div>

        <template v-if="composeMode === 'lend'">
          <p class="muted tiny" style="margin: 0 0 12px">
            暂时借用积分，到约定还回日还回去。逾期每天多还
            <strong>1 积分</strong>（最多多还
            {{ config.pointsPactMaxOverdueExtra }} 积分）。
          </p>
          <el-form label-position="top">
            <el-form-item label="向谁借用">
              <el-select v-model="form.lenderId" size="large" style="width: 100%">
                <el-option
                  v-for="s in siblings"
                  :key="s.id"
                  :label="s.name"
                  :value="s.id"
                />
              </el-select>
            </el-form-item>
            <el-form-item label="借用积分数">
              <el-input-number
                v-model="form.amountPoints"
                :min="1"
                :max="config.pointsPactMaxAmount || 50"
                size="large"
              />
            </el-form-item>
            <el-form-item label="约定还回日">
              <el-date-picker
                v-model="form.dueDate"
                type="date"
                value-format="YYYY-MM-DD"
                placeholder="选一天"
                size="large"
                style="width: 100%"
                :disabled-date="disablePast"
              />
            </el-form-item>
            <el-form-item label="一句话说明（可选）">
              <el-input
                v-model="form.note"
                size="large"
                maxlength="120"
                placeholder="例如：想先兑换愿望，周末打卡还回"
              />
            </el-form-item>
            <el-checkbox v-model="form.understood" size="large">
              我看懂了：积分不是钱；逾期每天多还 1 积分，最多
              {{ config.pointsPactMaxOverdueExtra }} 积分
              <template v-if="(config.pointsPactParentApproveAbove || 0) > 0">
                ；达到 {{ config.pointsPactParentApproveAbove }} 积分需家长先同意
              </template>
            </el-checkbox>
            <el-button
              type="primary"
              class="tap-btn full-tap"
              style="margin-top: 12px"
              :loading="saving"
              :disabled="!form.understood"
              @click="createPact"
            >
              发给对方确认
            </el-button>
          </el-form>
        </template>

        <template v-else>
          <p class="muted tiny" style="margin: 0 0 12px">
            自愿分享心意；对方收下后才扣你的积分，送出去不要求还回。单笔最多
            {{ giftConfig.pointsGiftMaxAmount }} 分。
          </p>
          <p v-if="pactOwed > 0" class="warn tiny" style="margin: 0 0 12px">
            你还有 {{ pactOwed }} 积分约定未还回，先顾还回更稳妥；仍可赠予。
          </p>
          <el-form label-position="top">
            <el-form-item label="送给谁">
              <el-select
                v-model="giftForm.toStudentId"
                size="large"
                style="width: 100%"
              >
                <el-option
                  v-for="s in siblings"
                  :key="s.id"
                  :label="s.name"
                  :value="s.id"
                />
              </el-select>
            </el-form-item>
            <el-form-item label="赠予积分数">
              <el-input-number
                v-model="giftForm.amountPoints"
                :min="1"
                :max="giftConfig.pointsGiftMaxAmount || 20"
                size="large"
              />
            </el-form-item>
            <el-form-item label="心意原因">
              <div class="reason-chips">
                <button
                  v-for="r in reasonOptions"
                  :key="r.code"
                  type="button"
                  class="reason-chip"
                  :class="{ active: giftForm.reasonCode === r.code }"
                  @click="giftForm.reasonCode = r.code"
                >
                  {{ r.label }}
                </button>
              </div>
            </el-form-item>
            <el-form-item
              :label="
                giftForm.reasonCode === 'other' ? '一句话说明（必填）' : '一句话（可选）'
              "
            >
              <el-input
                v-model="giftForm.note"
                size="large"
                maxlength="120"
                :placeholder="
                  giftForm.reasonCode === 'other'
                    ? '写两句你的心意'
                    : '可选补充'
                "
              />
            </el-form-item>
            <el-checkbox v-model="giftForm.understood" size="large">
              我看懂了：送出去不要求还回；积分不是钱
              <template v-if="(giftConfig.pointsGiftParentApproveAbove || 0) > 0">
                ；达到 {{ giftConfig.pointsGiftParentApproveAbove }} 积分需家长先同意
              </template>
            </el-checkbox>
            <el-button
              type="primary"
              class="tap-btn full-tap"
              style="margin-top: 12px"
              :loading="giftSaving"
              :disabled="!giftForm.understood || !giftForm.reasonCode"
              @click="createGift"
            >
              发出心意
            </el-button>
          </el-form>
        </template>
      </el-drawer>

      <CheckinCelebrate
        :visible="celebrate.visible"
        :message="celebrate.message"
        :points-awarded="0"
        :points-balance="celebrate.pointsBalance"
        :streak="0"
        :require-confirm="false"
        :next-wish="null"
        :quiet="teenMode"
        hide-meta
        @close="celebrate.visible = false"
      />

      <SoftPrompt
        v-model="soft.open"
        kid-mode
        :title="soft.title"
        :message="soft.message"
        :confirm-text="soft.confirmText"
        :cancel-text="soft.cancelText"
        :show-input="false"
        @confirm="onSoftConfirm"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import http from '../../api/http'
import { useAuthStore } from '../../stores/auth'
import { friendlyError } from '../../composables/useOnboarding'
import { useBreakpoint } from '../../composables/useBreakpoint'
import { pactSyncTick } from '../../composables/taskSync'
import EmptyState from '../../components/EmptyState.vue'
import PageSkeleton from '../../components/PageSkeleton.vue'
import CheckinCelebrate from '../../components/CheckinCelebrate.vue'
import SoftPrompt from '../../components/SoftPrompt.vue'
import {
  buildAcceptGiftSoftCopy,
  buildAcceptPactSoftCopy,
  buildRepayPactSoftCopy,
} from '../../composables/pactSoftCopy'
import { DISABLED_PACTS_CTA } from '../../composables/studentMoreEmpty'
import { createLoadGate, tryBegin } from '../../composables/asyncGuard'

type FocusMode = 'accept' | 'due' | 'parent' | null
type Mode = 'lend' | 'gift'

const reasonOptions = [
  { code: 'cheer', label: '祝贺你' },
  { code: 'wish_help', label: '帮你凑愿望' },
  { code: 'thanks', label: '感谢你帮过我' },
  { code: 'other', label: '其他心意' },
]

const pactsLoadGate = createLoadGate()

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()
const { isPhone } = useBreakpoint()
const myId = computed(() => auth.user?.id || 0)
const teenMode = computed(() => localStorage.getItem('ageBand') === 'teen')
const loading = ref(true)
const saving = ref(false)
const giftSaving = ref(false)
const actingId = ref(0)
const soft = reactive({
  open: false,
  mode: '' as '' | 'accept' | 'gift' | 'repay',
  id: 0,
  title: '',
  message: '',
  confirmText: '确定',
  cancelText: '再想想',
})
const enabled = ref(false)
const mode = ref<Mode>('lend')
const composeOpen = ref(false)
const composeMode = ref<Mode>('lend')
const items = ref<any[]>([])
const giftItems = ref<any[]>([])
const siblings = ref<any[]>([])
const focusMode = ref<FocusMode>(null)
const acceptSection = ref<HTMLElement | null>(null)
const listSection = ref<HTMLElement | null>(null)

function openCompose(next?: Mode) {
  composeMode.value = next || mode.value
  composeOpen.value = true
}
const config = reactive<any>({
  pointsPactMaxAmount: 50,
  pointsPactMaxOverdueExtra: 30,
  pointsPactParentApproveAbove: 20,
  pointsPactNote: '',
})
const giftConfig = reactive<any>({
  pointsGiftMaxAmount: 20,
  pointsGiftParentApproveAbove: 10,
  pointsGiftDailyMax: 1,
  pointsGiftWeeklyOutMax: 40,
})
const celebrate = reactive({
  visible: false,
  message: '',
  pointsBalance: 0,
})

const form = reactive({
  lenderId: 0 as number,
  amountPoints: 5,
  dueDate: '',
  note: '',
  understood: false,
})

const giftForm = reactive({
  toStudentId: 0 as number,
  amountPoints: 5,
  reasonCode: 'cheer' as string,
  note: '',
  understood: false,
})

const pendingAsLender = computed(() =>
  items.value.filter((p) => p.status === 'pending' && p.lenderId === myId.value),
)

const pendingGiftsToMe = computed(() =>
  giftItems.value.filter(
    (g) => g.status === 'pending' && g.toStudentId === myId.value,
  ),
)

const pactOwed = computed(() =>
  items.value
    .filter((p) => p.status === 'active' && p.borrowerId === myId.value)
    .reduce((s, p) => s + (Number(p.amountDue) || Number(p.amountPoints) || 0), 0),
)

function parseFocus(raw: unknown): FocusMode {
  const v = String(raw || '')
  if (v === 'accept' || v === 'due' || v === 'parent') return v
  return null
}

function isDueFocusPact(p: any) {
  if (p.status !== 'active' || p.borrowerId !== myId.value) return false
  if (p.overdueExtraDue > 0 || p.overdueDays > 0) return true
  const due = String(p.dueDate || '')
  if (!due) return false
  const today = new Date()
  const y = today.getFullYear()
  const m = String(today.getMonth() + 1).padStart(2, '0')
  const d = String(today.getDate()).padStart(2, '0')
  return due <= `${y}-${m}-${d}`
}

function isFocusedPact(p: any) {
  if (focusMode.value === 'parent') {
    return p.status === 'parent_pending' && p.borrowerId === myId.value
  }
  if (focusMode.value === 'due') return isDueFocusPact(p)
  return false
}

async function applyFocus() {
  const modeQ = parseFocus(route.query.focus)
  if (route.query.tab === 'gift') mode.value = 'gift'
  if (!modeQ) return
  mode.value = 'lend'
  focusMode.value = modeQ
  await nextTick()
  let target: Element | null = null
  if (modeQ === 'accept') {
    target = acceptSection.value
  } else {
    target = listSection.value?.querySelector('.focus-row') || listSection.value
  }
  if (target && 'scrollIntoView' in target) {
    ;(target as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'center' })
  }
  const q = { ...route.query }
  delete q.focus
  delete q.tab
  await router.replace({ path: route.path, query: q })
}

function disablePast(d: Date) {
  const t = new Date()
  t.setHours(0, 0, 0, 0)
  return d.getTime() < t.getTime()
}

function statusLabel(s: string) {
  return (
    (
      {
        parent_pending: '待家长同意',
        pending: '待确认',
        active: '进行中',
        repaid: '已还清',
        cancelled: '已取消',
        written_off: '已结束',
      } as any
    )[s] || s
  )
}

function statusType(s: string) {
  return (
    (
      {
        parent_pending: 'warning',
        pending: 'warning',
        active: 'success',
        repaid: 'info',
        cancelled: 'info',
        written_off: 'info',
      } as any
    )[s] || 'info'
  )
}

function giftStatusLabel(s: string) {
  return (
    (
      {
        parent_pending: '待家长同意',
        pending: '待收下',
        completed: '已收下',
        cancelled: '已取消',
      } as any
    )[s] || s
  )
}

function giftStatusType(s: string) {
  return (
    (
      {
        parent_pending: 'warning',
        pending: 'warning',
        completed: 'success',
        cancelled: 'info',
      } as any
    )[s] || 'info'
  )
}

function reasonLabel(code: string) {
  return reasonOptions.find((r) => r.code === code)?.label || code
}

async function load(opts?: { soft?: boolean }) {
  const soft = !!opts?.soft
  const ticket = pactsLoadGate.next()
  if (!soft) loading.value = true
  try {
    const [mine, sib, gifts]: any[] = await Promise.all([
      http.get('/pacts/me'),
      http.get('/pacts/siblings'),
      http.get('/gifts/me').catch(() => ({ enabled: false, items: [], config: {} })),
    ])
    if (!ticket.isCurrent()) return
    enabled.value = !!mine.enabled
    items.value = mine.items || []
    Object.assign(config, mine.config || sib.config || {})
    giftItems.value = gifts.items || []
    Object.assign(giftConfig, gifts.config || {})
    siblings.value = sib.siblings || []
    if (!form.lenderId && siblings.value[0]) {
      form.lenderId = siblings.value[0].id
    }
    if (!giftForm.toStudentId && siblings.value[0]) {
      giftForm.toStudentId = siblings.value[0].id
    }
  } catch (e: any) {
    if (!ticket.isCurrent()) return
    if (!soft) ElMessage.error(friendlyError(e, '积分约定暂时打不开'))
  } finally {
    if (ticket.isCurrent() && !soft) loading.value = false
    if (ticket.isCurrent()) await applyFocus()
  }
}

async function createPact() {
  if (!form.lenderId) return ElMessage.warning('请选择向谁借用')
  if (!form.dueDate) return ElMessage.warning('请选择约定还回日')
  if (!form.understood) return ElMessage.warning('请先确认已看懂约定')
  if (!tryBegin(saving)) return
  try {
    const created: any = await http.post('/pacts', {
      lenderId: form.lenderId,
      amountPoints: form.amountPoints,
      dueDate: form.dueDate,
      note: form.note || undefined,
    })
    if (created?.status === 'parent_pending') {
      ElMessage.success('已发给家长看一眼，同意后再等对方确认')
    } else {
      ElMessage.success('已发给对方，等对方同意后积分才会转移')
    }
    form.note = ''
    form.understood = false
    composeOpen.value = false
    mode.value = 'lend'
    await load()
    await auth.fetchMe()
  } catch (e: any) {
    ElMessage.error(friendlyError(e, '发起没成功'))
  } finally {
    saving.value = false
  }
}

async function createGift() {
  if (!giftForm.toStudentId) return ElMessage.warning('请选择送给谁')
  if (!giftForm.reasonCode) return ElMessage.warning('请选择心意原因')
  if (!giftForm.understood) return ElMessage.warning('请先确认已看懂赠予规则')
  if (giftForm.reasonCode === 'other' && giftForm.note.trim().length < 2) {
    return ElMessage.warning('选择「其他心意」时请写至少两个字')
  }
  giftSaving.value = true
  try {
    const created: any = await http.post('/gifts', {
      toStudentId: giftForm.toStudentId,
      amountPoints: giftForm.amountPoints,
      reasonCode: giftForm.reasonCode,
      note: giftForm.note || undefined,
    })
    if (created?.status === 'parent_pending') {
      ElMessage.success('已发给家长看一眼，同意后再等对方收下')
    } else {
      ElMessage.success('已发出心意，等对方收下后积分才会转移')
    }
    giftForm.note = ''
    giftForm.understood = false
    composeOpen.value = false
    mode.value = 'gift'
    await load()
    await auth.fetchMe()
  } catch (e: any) {
    ElMessage.error(friendlyError(e, '发出没成功'))
  } finally {
    giftSaving.value = false
  }
}

function accept(p: any) {
  soft.mode = 'accept'
  soft.id = p.id
  const copy = buildAcceptPactSoftCopy(p)
  soft.title = copy.title
  soft.message = copy.message
  soft.confirmText = copy.confirmText
  soft.cancelText = copy.cancelText
  soft.open = true
}

async function reject(p: any) {
  actingId.value = p.id
  try {
    await http.post(`/pacts/${p.id}/reject`)
    ElMessage.success('已婉拒')
    await load()
  } catch (e: any) {
    ElMessage.error(friendlyError(e, '操作没成功'))
  } finally {
    actingId.value = 0
  }
}

async function cancel(p: any) {
  try {
    await http.post(`/pacts/${p.id}/cancel`)
    ElMessage.success('已取消')
    await load()
  } catch (e: any) {
    ElMessage.error(friendlyError(e, '取消没成功'))
  }
}

function acceptGift(g: any) {
  soft.mode = 'gift'
  soft.id = g.id
  const copy = buildAcceptGiftSoftCopy(g)
  soft.title = copy.title
  soft.message = copy.message
  soft.confirmText = copy.confirmText
  soft.cancelText = copy.cancelText
  soft.open = true
}

async function rejectGift(g: any) {
  actingId.value = g.id
  try {
    await http.post(`/gifts/${g.id}/reject`)
    ElMessage.success('已婉拒')
    await load()
  } catch (e: any) {
    ElMessage.error(friendlyError(e, '操作没成功'))
  } finally {
    actingId.value = 0
  }
}

async function cancelGift(g: any) {
  try {
    await http.post(`/gifts/${g.id}/cancel`)
    ElMessage.success('已取消')
    await load()
  } catch (e: any) {
    ElMessage.error(friendlyError(e, '取消没成功'))
  }
}

function repay(p: any) {
  soft.mode = 'repay'
  soft.id = p.id
  const copy = buildRepayPactSoftCopy(p)
  soft.title = copy.title
  soft.message = copy.message
  soft.confirmText = copy.confirmText
  soft.cancelText = copy.cancelText
  soft.open = true
}

async function onSoftConfirm() {
  const id = soft.id
  const mode = soft.mode
  soft.open = false
  if (!id || !mode) return
  actingId.value = id
  try {
    if (mode === 'accept') {
      await http.post(`/pacts/${id}/accept`)
      ElMessage.success('已同意，积分已借出')
      await load()
      await auth.fetchMe()
    } else if (mode === 'gift') {
      await http.post(`/gifts/${id}/accept`)
      ElMessage.success('已收下心意')
      await load()
      await auth.fetchMe()
    } else if (mode === 'repay') {
      const res: any = await http.post(`/pacts/${id}/repay`)
      await load()
      await auth.fetchMe()
      if (res?.onTime) {
        celebrate.message = res.message || '说到做到！积分已按约定还回。'
        celebrate.pointsBalance = res.pointsBalance ?? auth.user?.pointsBalance ?? 0
        celebrate.visible = true
      } else {
        ElMessage.success(res?.message || '已还清')
      }
    }
  } catch (e: any) {
    const fallback =
      mode === 'accept' ? '同意没成功' : mode === 'gift' ? '收下没成功' : '还回没成功'
    ElMessage.error(friendlyError(e, fallback))
  } finally {
    actingId.value = 0
    soft.mode = ''
    soft.id = 0
  }
}

watch(
  () => route.query.focus,
  () => {
    if (!loading.value) void applyFocus()
  },
)

watch(pactSyncTick, () => {
  void load({ soft: true })
})

onMounted(load)
</script>

<style scoped>
.lead {
  margin: 0 0 8px;
  line-height: 1.55;
}
.intro-line {
  margin: 4px 0 0;
}
.intro-fold {
  margin-bottom: 12px;
}
.pending-panel {
  margin-bottom: 12px;
  border-color: color-mix(in srgb, var(--warn, #c47b3a) 28%, var(--line));
}
.pending-title {
  display: flex;
  align-items: center;
  gap: 8px;
}
.pending-sub {
  margin: 0 0 8px;
}
.tiny {
  font-size: 0.88rem;
}
.note {
  white-space: pre-wrap;
  margin-top: 6px;
}
.intro {
  margin-bottom: 12px;
}
.mode-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}
.mode-tab {
  flex: 1;
  border: 1px solid var(--line);
  background: var(--panel, #fff);
  border-radius: 12px;
  padding: 10px 12px;
  font-size: 1rem;
  font-family: var(--font-display);
  cursor: pointer;
  color: inherit;
}
.mode-tab.active {
  border-color: var(--el-color-primary);
  background: color-mix(in srgb, var(--el-color-primary) 12%, transparent);
  font-weight: 600;
}
h3 {
  margin: 0 0 12px;
  font-family: var(--font-display);
}
.reason-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.reason-chip {
  border: 1px solid var(--line);
  background: transparent;
  border-radius: 999px;
  padding: 8px 12px;
  cursor: pointer;
  color: inherit;
  font-size: 0.92rem;
}
.reason-chip.active {
  border-color: var(--el-color-primary);
  background: color-mix(in srgb, var(--el-color-primary) 14%, transparent);
}
.pact-row {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px 0;
  border-bottom: 1px dashed var(--line);
}
.pact-row:last-child {
  border-bottom: none;
}
.pact-row.focus-row,
.focus-ring {
  border-radius: 12px;
  outline: 2px solid var(--el-color-primary);
  outline-offset: 4px;
  background: color-mix(in srgb, var(--el-color-primary) 8%, transparent);
}
.row-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.full-tap {
  width: 100%;
}
.warn {
  color: var(--el-color-warning);
  margin-top: 4px;
}
</style>
