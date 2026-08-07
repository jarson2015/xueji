<template>
  <div class="page" :class="{ 'with-wish-fab': isPhone }">
    <PageSkeleton v-if="loading" :rows="4" />
    <template v-else>
    <h2 class="page-title">{{ labels.studentRewards }}</h2>
    <p class="lead muted">
      {{
        starMode
          ? '愿望更适合一起经历的事。星星是鼓励，不是目的。'
          : '愿望更适合一起经历的事：陪伴、体验、选择权。积分是工具，不是目的。'
      }}
    </p>

    <div v-if="points.nextWish" class="card-panel goal">
      <div class="goal-label">
        {{ points.nextWish.isNearTerm ? '这周就能靠近的小目标' : '一起努力的小目标' }}
      </div>
      <h3>{{ points.nextWish.title }}</h3>
      <el-progress
        :percentage="wishPercent"
        :stroke-width="14"
        color="var(--accent)"
      />
      <p class="muted">
        {{ points.nextWish.lackPoints > 0
          ? (points.nextWish.isNearTerm
            ? `再攒 ${points.nextWish.lackPoints} ${starMode ? '星' : '分'}，就能商量兑现啦`
            : '再靠近一些就能和家人商量兑现')
          : '可以和家长商量兑现啦' }}
      </p>
    </div>

    <div v-if="nearTermWishes.length" class="card-panel near-term-block">
      <div class="section-head">
        <h3>先兑这些</h3>
        <span class="muted tiny">近端愿望 · 更容易达成</span>
      </div>
      <div class="wish-grid">
        <div
          v-for="w in nearTermWishes"
          :key="'near-' + w.id"
          class="wish-card near"
          :class="{ disabled: !canAfford(w) }"
        >
          <div class="wish-top">
            <span class="near-tag">近端</span>
            <span class="wish-cost">{{ w.costPoints }}{{ starMode ? '星' : '分' }}</span>
          </div>
          <div class="wish-title">{{ w.title }}</div>
          <el-button
            type="primary"
            class="tap-btn"
            round
            :disabled="!canRedeem(w) || redeeming"
            @click="redeem(w)"
          >
            {{ pendingWishIds.has(w.id) ? '等待中' : canAfford(w) ? '兑愿望' : '再攒一点' }}
          </el-button>
        </div>
      </div>
    </div>

    <div class="card-panel balance soft-balance">
      <div class="balance-row">
        <span class="muted">{{ starMode ? '我的星星' : '可用积分' }}</span>
        <strong class="balance-num">{{ points.balance }}</strong>
      </div>
      <p class="balance-tip muted">
        {{ balanceOneLiner }}
        <template v-if="pactOwed > 0">
          · 约定中还有 {{ pactOwed }} 分，
          <a href="javascript:;" @click="$router.push('/student/pacts')">去看约定</a>
        </template>
      </p>
    </div>

    <div v-if="ackRedeems.length" class="card-panel ack-strip">
      <div class="ack-strip-head muted">有愿望已兑现，点一下告诉家长</div>
      <div v-for="r in ackRedeems" :key="r.id" class="redeem-row ack-row">
        <div>
          <strong>{{ r.wish?.title || '愿望' }}</strong>
          <el-tag
            v-if="r.wish?.type === 'golden_finger'"
            size="small"
            class="finger-tag"
            effect="plain"
          >
            家庭互助卡
          </el-tag>
        </div>
        <el-button
          type="primary"
          class="tap-btn"
          :loading="ackingId === r.id"
          @click="ackRedeem(r)"
        >
          我收到了
        </el-button>
      </div>
    </div>

    <div class="card-panel shop-main">
      <div class="shop-head">
        <h3>{{ nearTermWishes.length ? '慢慢攒' : '愿望商店' }}</h3>
        <el-button text type="primary" @click="proposeDlg = true">
          我想提一个
        </el-button>
      </div>
      <div class="task-grid wish-grid">
        <div
          v-for="w in sortedWishes"
          :key="w.id"
          class="wish-card"
          :class="{ 'is-finger': w.type === 'golden_finger' }"
        >
          <div>
            <div class="wish-head">
              <strong class="wish-title">{{ w.title }}</strong>
              <el-tag
                v-if="w.type === 'golden_finger'"
                size="small"
                class="finger-tag"
                effect="plain"
              >
                家庭互助卡
              </el-tag>
            </div>
            <div class="muted">
              {{ w.costPoints }} {{ starMode ? '星星' : '积分' }}
              <template v-if="w.type === 'golden_finger'"> · 先缓缓一件家务</template>
            </div>
            <div class="muted lack" v-if="pendingWishIds.has(w.id)">
              已提交，等家长看看
            </div>
            <div class="muted lack" v-else-if="w.costPoints > points.balance">
              还差 {{ w.costPoints - points.balance }} 分
            </div>
          </div>
          <el-button
            type="primary"
            class="tap-btn"
            :class="{ 'full-tap': isPhone || isTv }"
            :disabled="!canRedeem(w)"
            @click="redeem(w)"
          >
            {{ pendingWishIds.has(w.id) ? '等待中' : '兑换' }}
          </el-button>
        </div>
      </div>
      <div v-if="!wishes.length">
        <EmptyState title="暂无愿望" description="可以先提出一个愿望，或请家长添加家庭互助卡。" />
      </div>
      <div v-else-if="!sortedWishes.length && nearTermWishes.length" class="muted tiny" style="margin-top: 8px">
        其余愿望还没有；近端愿望在上方「先兑这些」。
      </div>
    </div>

    <el-collapse class="history-fold">
      <el-collapse-item name="redeems">
        <template #title>
          <span>我的兑换 <span class="muted">{{ historyRedeems.length }}</span></span>
        </template>
        <div v-for="r in historyRedeems" :key="r.id" class="redeem-row">
          <div>
            <strong>{{ r.wish?.title || '愿望' }}</strong>
            <el-tag
              v-if="r.wish?.type === 'golden_finger'"
              size="small"
              class="finger-tag"
              effect="plain"
            >
              家庭互助卡
            </el-tag>
            <div class="muted">
              {{ r.costPoints || r.wish?.costPoints || 0 }} {{ starMode ? '星星' : '积分' }} · {{ formatTime(r.createdAt) }}
              <template v-if="r.effectTitle"> · 已免「{{ r.effectTitle }}」</template>
            </div>
          </div>
          <el-tag :type="redeemTagType(r.status)" effect="plain">
            {{ redeemLabel(r.status) }}
          </el-tag>
        </div>
        <div v-if="!historyRedeems.length">
          <EmptyState title="还没有兑换记录" description="攒够积分后，可以在愿望商店兑换。" />
        </div>
      </el-collapse-item>
    </el-collapse>

    <el-collapse class="history-fold">
      <el-collapse-item name="ledgers">
        <template #title>
          <span>{{ starMode ? '星星记录' : '积分流水' }}</span>
        </template>
        <p class="muted tip">需要家长确认的任务，通过后才会出现加分记录</p>
        <div v-for="l in points.ledgers || []" :key="l.id" class="ledger-row">
          <span>{{ l.note || l.reason }}</span>
          <strong :class="l.delta > 0 ? 'plus' : 'minus'">
            {{ l.delta > 0 ? '+' : '' }}{{ l.delta }}
          </strong>
        </div>
        <div v-if="!points.ledgers?.length">
          <EmptyState title="暂无流水" description="完成今日任务后，这里会出现加分记录。" />
        </div>
      </el-collapse-item>
    </el-collapse>

    <p class="muted tip allowance-link">
      积分换愿望；真实用钱请看
      <a href="javascript:;" @click="$router.push('/student/allowance')">零花钱账本</a>
      （家庭开启后可用，两套互不兑换）。
      <template v-if="pactsEnabled">
        ·
        <a href="javascript:;" @click="$router.push('/student/pacts')">积分约定</a>
        （暂时借用积分，不是钱）
      </template>
    </p>

    <button
      v-if="isPhone"
      type="button"
      class="wish-fab"
      aria-label="提出愿望"
      @click="proposeDlg = true"
    >
      +
    </button>

    <el-drawer
      v-model="proposeDlg"
      title="提出愿望"
      :direction="isPhone ? 'btt' : 'rtl'"
      :size="isPhone ? 'var(--drawer-phone)' : '400px'"
    >
      <p class="muted tip">
        更推荐体验与陪伴。写给家长看；上架时可标「近端可兑」，更容易这周就够到。
      </p>
      <div class="propose-chips">
        <button
          v-for="t in proposeNearChips"
          :key="t.title"
          type="button"
          class="propose-chip"
          @click="applyProposeChip(t)"
        >
          {{ t.title }}
        </button>
      </div>
      <el-input
        v-model="proposeTitle"
        size="large"
        maxlength="80"
        show-word-limit
        placeholder="例如：周末一起去公园"
      />
      <div class="propose-row">
        <span class="muted">品类</span>
        <el-radio-group v-model="proposeKind" size="large">
          <el-radio-button value="experience">体验</el-radio-button>
          <el-radio-button value="company">陪伴</el-radio-button>
          <el-radio-button value="choice">选择权</el-radio-button>
          <el-radio-button value="item">物品</el-radio-button>
        </el-radio-group>
      </div>
      <div class="propose-row">
        <span class="muted">建议积分（可选）</span>
        <el-input-number v-model="proposePoints" :min="1" :max="500" size="large" />
      </div>
      <el-button
        type="primary"
        class="tap-btn full-tap"
        :loading="proposing"
        :disabled="!proposeTitle.trim()"
        @click="submitPropose"
      >
        发给家长看看
      </el-button>
      <div v-if="myProposals.length" class="prop-list">
        <div v-for="p in myProposals" :key="p.id" class="prop-row">
          <div>
            <strong>{{ p.title }}</strong>
            <div class="muted">建议 {{ p.costPoints }} 积分 · 等家长定分上架</div>
          </div>
          <el-tag type="warning" effect="plain">待审定</el-tag>
        </div>
      </div>
    </el-drawer>
    </template>

    <SoftPrompt
      v-model="soft.open"
      kid-mode
      :title="soft.title"
      :message="soft.message"
      :confirm-text="soft.confirmText"
      :cancel-text="soft.cancelText"
      :show-input="false"
      @confirm="onRedeemSoftConfirm"
      @cancel="onRedeemSoftCancel"
    />
    <SoftStay v-model:message="stayMsg" />
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onActivated, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import http from '../../api/http'
import { useAuthStore } from '../../stores/auth'
import { useBreakpoint } from '../../composables/useBreakpoint'
import { useSocket } from '../../composables/useSocket'
import { friendlyError } from '../../composables/useOnboarding'
import { labels } from '../../composables/labels'
import EmptyState from '../../components/EmptyState.vue'
import PageSkeleton from '../../components/PageSkeleton.vue'
import SoftPrompt from '../../components/SoftPrompt.vue'
import SoftStay from '../../components/SoftStay.vue'
import { usesStarNarrative } from '../../composables/pointsNarrative'
import { createLoadGate, tryBegin } from '../../composables/asyncGuard'
import {
  buildAckStayMessage,
  buildRedeemSoftCopy,
  buildRedeemStayMessage,
} from '../../composables/redeemSoftCopy'

defineOptions({ name: 'StudentRewardsView' })

const auth = useAuthStore()
const { isPhone, isTv } = useBreakpoint()
const { on, connect } = useSocket()
const wishes = ref<any[]>([])
const myProposals = ref<any[]>([])
const redeems = ref<any[]>([])
const loading = ref(true)
const proposing = ref(false)
const redeeming = ref(false)
const stayMsg = ref('')
const soft = reactive({
  open: false,
  mode: '' as '' | 'finger' | 'pact' | 'normal',
  wish: null as any,
  title: '',
  message: '',
  confirmText: '确定',
  cancelText: '再想想',
})
const ackingId = ref(0)
const proposeDlg = ref(false)
const rewardsLoadGate = createLoadGate()
const proposeTitle = ref('')
const proposePoints = ref(30)
const proposeKind = ref('experience')
const proposeNearChips = [
  { title: '周末一起去公园', kind: 'experience', points: 20 },
  { title: '多陪我聊一会儿', kind: 'company', points: 15 },
  { title: '选今晚故事', kind: 'choice', points: 10 },
  { title: '一起做一件兴趣事', kind: 'company', points: 15 },
  { title: '决定周末玩什么', kind: 'choice', points: 10 },
]

function applyProposeChip(t: { title: string; kind: string; points: number }) {
  proposeTitle.value = t.title
  proposeKind.value = t.kind
  proposePoints.value = t.points
}
const pactsEnabled = ref(false)
const pactOwed = ref(0)
const ageBand = ref(localStorage.getItem('ageBand') || 'general')
const starMode = computed(() => usesStarNarrative(ageBand.value))
const myId = computed(() => auth.user?.id || 0)
const points = reactive<any>({
  balance: 0,
  ledgers: [],
  rulesHint: '',
  nextWish: null,
})

const ackRedeems = computed(() => redeems.value.filter((r) => needsAck(r)))
const historyRedeems = computed(() => redeems.value.filter((r) => !needsAck(r)))

const balanceOneLiner = computed(() => {
  const hint = (points.rulesHint || '').trim()
  if (hint) return hint
  return starMode.value
    ? '兑换后星星先交家长保管；兑现后愿望生效。'
    : '兑换后积分先交家长保管；兑现后愿望生效。'
})

const pendingWishIds = computed(() => {
  const set = new Set<number>()
  for (const r of redeems.value) {
    if (r.status === 'pending') set.add(r.wishId)
  }
  return set
})

const wishPercent = computed(() => {
  const w = points.nextWish
  if (!w?.costPoints) return 0
  const have = w.costPoints - w.lackPoints
  return Math.min(100, Math.round((have / w.costPoints) * 100))
})

const nearTermWishes = computed(() =>
  wishes.value.filter((w) => !!w.isNearTerm),
)

/** 体验/陪伴优先；近端已在上方「先兑这些」，此处只展示其余 */
const sortedWishes = computed(() => {
  const rank = (w: any) => {
    if (w.type === 'golden_finger') return 40
    const k = String(w.kind || '')
    if (k === 'experience' || k === 'company') return 0
    if (k === 'choice') return 10
    if (k === 'item') return 20
    return 15
  }
  return [...wishes.value]
    .filter((w) => !w.isNearTerm)
    .sort((a, b) => rank(a) - rank(b) || a.id - b.id)
})

function canAfford(w: any) {
  return Number(w.costPoints) <= Number(points.balance)
}

function canRedeem(w: any) {
  if (pendingWishIds.value.has(w.id)) return false
  return canAfford(w)
}

function redeemLabel(s: string) {
  return ({ pending: '等家长看看', approved: '已兑现', rejected: '再商量' } as any)[s] || s
}

function redeemTagType(s: string) {
  return ({ pending: 'warning', approved: 'success', rejected: 'info' } as any)[s] || 'info'
}

function needsAck(r: any) {
  return r.status === 'approved' && !r.studentAckAt
}

async function ackRedeem(r: any) {
  if (ackingId.value) return
  ackingId.value = r.id
  try {
    await http.post(`/my/redeems/${r.id}/ack`)
    stayMsg.value = buildAckStayMessage()
    await load()
  } catch (e: any) {
    ElMessage.error(friendlyError(e, '确认没成功'))
  } finally {
    ackingId.value = 0
  }
}

function formatTime(v: string) {
  if (!v) return ''
  const d = new Date(v)
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(
    d.getMinutes(),
  ).padStart(2, '0')}`
}

async function load() {
  const ticket = rewardsLoadGate.next()
  loading.value = true
  try {
    const [w, p, r, pact, proposals] = await Promise.all([
      http.get('/wishes'),
      http.get('/points'),
      http.get('/my/redeems'),
      http.get('/pacts/me').catch(() => ({ enabled: false })),
      http.get('/wishes/my-proposals').catch(() => []),
    ])
    if (!ticket.isCurrent()) return
    wishes.value = w as any[]
    myProposals.value = proposals as any[]
    Object.assign(points, p)
    redeems.value = r as any[]
    pactsEnabled.value = !!(pact as any)?.enabled
    const items = ((pact as any)?.items || []) as any[]
    pactOwed.value = items
      .filter((x) => x.status === 'active' && x.borrowerId === myId.value)
      .reduce((s, x) => s + (Number(x.amountDue) || Number(x.amountPoints) || 0), 0)
    await auth.fetchMe()
  } catch (e: any) {
    if (!ticket.isCurrent()) return
    ElMessage.error(friendlyError(e, '奖励页暂时打不开'))
  } finally {
    if (ticket.isCurrent()) loading.value = false
  }
}

async function submitPropose() {
  const title = proposeTitle.value.trim()
  if (!title) return
  if (!tryBegin(proposing)) return
  try {
    await http.post('/wishes/propose', {
      title,
      suggestedCostPoints: proposePoints.value,
      kind: proposeKind.value,
    })
    ElMessage.success('已发给家长，等定积分后上架')
    proposeTitle.value = ''
    proposeDlg.value = false
    await load()
  } catch (e: any) {
    ElMessage.error(friendlyError(e, '发送没成功'))
  } finally {
    proposing.value = false
  }
}

function openRedeemSoft(
  mode: 'finger' | 'pact' | 'normal',
  w: any,
) {
  soft.mode = mode
  soft.wish = w
  const copy = buildRedeemSoftCopy(mode, w, {
    pactOwed: pactOwed.value,
    balance: points.balance,
  })
  soft.title = copy.title
  soft.message = copy.message
  soft.confirmText = copy.confirmText
  soft.cancelText = copy.cancelText
  soft.open = true
}

function redeem(w: any) {
  if (!tryBegin(redeeming)) return
  if (w.type === 'golden_finger') {
    openRedeemSoft('finger', w)
    return
  }
  if (pactOwed.value > 0) {
    openRedeemSoft('pact', w)
    return
  }
  openRedeemSoft('normal', w)
}

function onRedeemSoftCancel() {
  redeeming.value = false
  soft.mode = ''
  soft.wish = null
}

async function onRedeemSoftConfirm() {
  const w = soft.wish
  const mode = soft.mode
  soft.open = false
  if (!w || !mode) {
    redeeming.value = false
    return
  }
  if (mode === 'finger' && pactOwed.value > 0) {
    await nextTick()
    openRedeemSoft('pact', w)
    return
  }
  try {
    await http.post(`/wishes/${w.id}/redeem`)
    stayMsg.value = buildRedeemStayMessage(w.type)
    await load()
  } catch (e: any) {
    ElMessage.error(friendlyError(e, '兑换没成功'))
  } finally {
    redeeming.value = false
    soft.mode = ''
    soft.wish = null
  }
}

onMounted(() => {
  load()
  connect()
  on('redeem:reviewed', async () => {
    await load()
  })
  on('checkin:confirmed', async () => {
    await load()
  })
  on('wish:approved', async (payload: any) => {
    if (payload?.message) stayMsg.value = String(payload.message)
    await load()
  })
  on('wish:removed', async () => {
    await load()
  })
})
let skipActivatedLoad = true
onActivated(() => {
  if (skipActivatedLoad) {
    skipActivatedLoad = false
    return
  }
  void load()
})
</script>

<style scoped>
.propose-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin: 12px 0;
  flex-wrap: wrap;
}
.propose-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 0 0 12px;
}
.propose-chip {
  border: 1px solid var(--line, #d8e0d6);
  background: #fff;
  border-radius: 999px;
  padding: 8px 12px;
  min-height: var(--tap-min, 44px);
  cursor: pointer;
  font: inherit;
  text-align: left;
}
.prop-list {
  margin-top: 14px;
}
.prop-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 10px 0;
  border-bottom: 1px dashed var(--line);
}
.balance {
  text-align: center;
  padding: 28px 16px;
}
.soft-balance {
  text-align: left;
  padding: 12px 16px;
}
.soft-balance .balance-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
}
.soft-balance .balance-num {
  font-size: 1.35rem;
  font-weight: 700;
  color: var(--accent);
  font-family: var(--font-display);
}
.balance-tip {
  margin: 6px 0 0;
  font-size: 0.85rem;
  line-height: 1.4;
}
.balance-tip a {
  color: var(--accent);
  text-decoration: underline;
}
.ack-strip {
  padding: 12px 16px;
  border-color: color-mix(in srgb, var(--accent, #3d8b6e) 22%, var(--line));
}
.ack-strip-head {
  font-size: 0.88rem;
  margin-bottom: 6px;
}
.ack-row {
  padding: 8px 0;
  border-bottom: none;
}
.shop-main h3 {
  margin: 0;
}
.shop-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 4px;
}
.lead {
  margin: -4px 0 14px;
  line-height: 1.45;
}
.goal h3 {
  margin: 6px 0 12px;
  font-family: var(--font-display);
}
.goal-label {
  font-weight: 700;
  color: var(--accent);
}
.near-term-block .section-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 4px;
}
.near-term-block .section-head h3 {
  margin: 0;
}
.wish-card.near {
  border-bottom: 1px solid var(--line);
  padding: 12px 0;
}
.wish-card.near.disabled {
  opacity: 0.72;
}
.wish-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.near-tag {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--accent);
}
.wish-cost {
  font-size: 0.85rem;
  color: var(--muted, #6b7280);
}
h3 {
  margin-top: 0;
  font-family: var(--font-display);
}
.history-fold {
  margin-bottom: 12px;
  border: none;
}
.history-fold :deep(.el-collapse-item__header) {
  font-weight: 600;
  font-size: 1rem;
}
.wish-fab {
  position: fixed;
  right: 18px;
  bottom: calc(72px + env(safe-area-inset-bottom, 0px));
  z-index: 20;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  border: 0;
  background: var(--accent, #3d8b6e);
  color: #fff;
  font-size: 1.8rem;
  font-weight: 500;
  line-height: 1;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.18);
  cursor: pointer;
}
.with-wish-fab {
  padding-bottom: 88px;
}
.wish-grid {
  margin-top: 8px;
}
.wish-card,
.redeem-row {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px 0;
  border-bottom: 1px solid var(--line);
}
.wish-title {
  font-size: 1.1rem;
}
.wish-head {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.finger-tag {
  --el-tag-bg-color: #fff8e0;
  --el-tag-border-color: rgba(180, 140, 40, 0.35);
  --el-tag-text-color: #9a7200;
}
.wish-card.is-finger {
  background: linear-gradient(160deg, #fffef8 0%, #fff 70%);
  border-radius: 12px;
  padding: 14px 12px;
  border: 1px solid rgba(180, 140, 40, 0.22);
  border-bottom: 1px solid rgba(180, 140, 40, 0.22);
  margin-bottom: 8px;
}
.lack {
  margin-top: 4px;
  color: var(--warn) !important;
}
.tip {
  margin-top: -4px;
  margin-bottom: 8px;
  font-size: 0.88rem;
}
.allowance-link a {
  color: var(--accent);
  text-decoration: underline;
}
.ledger-row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px dashed var(--line);
}
.plus {
  color: var(--accent);
}
.minus {
  color: var(--danger);
}
@media (min-width: 768px) {
  .wish-card,
  .redeem-row {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }
  .wish-card {
    border: 1px solid var(--line);
    border-radius: 12px;
    padding: 16px;
  }
}
</style>
