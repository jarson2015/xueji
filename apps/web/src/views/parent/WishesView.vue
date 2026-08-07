<template>
  <div class="page" :class="{ 'tv-mode': isTv, 'with-wish-fab': isPhone }">
    <PageSkeleton v-if="loading" :rows="4" />
    <template v-else>
    <div class="page-head">
      <h2 class="page-title" style="margin: 0">{{ labels.parentWishes }}</h2>
      <el-button v-if="!isPhone" type="primary" class="tap-btn" @click="dlg = true">
        添加愿望
      </el-button>
    </div>

    <p class="lead muted">孩子可提报；你定积分后上架。兑换先扣分，「兑现」表示给到，「先缓缓」退回。</p>

    <div class="card-panel action-strip" v-if="proposedWishes.length">
      <h3>待审定 <el-tag type="warning" size="small">{{ proposedWishes.length }}</el-tag></h3>
      <p class="muted tiny-hint">孩子提报的愿望，定好积分后即可上架商店。</p>
      <div v-for="w in proposedWishes" :key="w.id" class="wish-row">
        <div class="row-main">
          <div>
            <strong>{{ w.title }}</strong>
            <div class="muted">
              {{ w.student?.name || w.studentId }} · 建议 {{ w.costPoints }} 积分
            </div>
          </div>
        </div>
        <div class="row-actions">
          <el-button type="primary" class="tap-btn" @click="openApprove(w)">定积分上架</el-button>
          <el-button class="tap-btn" text type="danger" @click="removeWish(w)">删除</el-button>
        </div>
      </div>
    </div>

    <div class="card-panel action-strip" v-if="pendingRedeems.length">
      <h3>待兑现 <el-tag type="warning" size="small">{{ pendingRedeems.length }}</el-tag></h3>
      <div v-if="selectedRedeemIds.length" class="batch-bar">
        <span class="batch-count">已选 {{ selectedRedeemIds.length }} 项兑换</span>
        <div class="batch-actions">
          <el-button
            type="primary"
            class="tap-btn"
            :loading="batchBusy"
            @click="batchApproveRedeems"
          >
            批量兑现
          </el-button>
          <el-button class="tap-btn" :loading="batchBusy" @click="openBatchRejectRedeems">
            批量先缓缓
          </el-button>
          <el-button text class="tap-btn" @click="selectedRedeemIds = []">取消选择</el-button>
        </div>
      </div>
      <div v-for="r in pendingRedeems" :key="r.id" class="redeem-row pending">
        <div class="row-main">
          <el-checkbox
            class="row-check"
            :model-value="selectedRedeemIds.includes(r.id)"
            @change="(v: boolean | string | number) => toggleRedeemSelect(r.id, !!v)"
          />
          <div>
            <strong>{{ r.student?.name }}</strong>
            · {{ r.wish?.title }}
            <el-tag
              v-if="r.wish?.type === 'golden_finger'"
              size="small"
              class="finger-tag"
              effect="plain"
            >
              家庭互助卡
            </el-tag>
            <div class="muted">
              已扣 {{ r.costPoints || r.wish?.costPoints || 0 }} 积分 · 等你看看
              <template v-if="r.wish?.type === 'golden_finger'">
                · 兑现后先缓缓一件家务（请单条兑现）
              </template>
            </div>
          </div>
        </div>
        <div class="row-actions">
          <el-button type="primary" class="tap-btn" @click="review(r, 'approve')">
            兑现
          </el-button>
          <el-button class="tap-btn" @click="review(r, 'reject')">先缓缓</el-button>
        </div>
      </div>
    </div>

    <div class="card-panel list-main">
      <h3>愿望清单</h3>
      <div v-if="selectedWishIds.length" class="batch-bar">
        <span class="batch-count">已选 {{ selectedWishIds.length }} 项愿望</span>
        <div class="batch-actions">
          <el-button class="tap-btn" :loading="batchBusy" @click="batchSetActive(true)">
            批量上架
          </el-button>
          <el-button class="tap-btn" :loading="batchBusy" @click="batchSetActive(false)">
            批量下架
          </el-button>
          <el-button
            class="tap-btn"
            type="danger"
            :loading="batchBusy"
            @click="batchRemoveWishes"
          >
            批量删除
          </el-button>
          <el-button text class="tap-btn" @click="selectedWishIds = []">取消选择</el-button>
        </div>
      </div>
      <div class="task-grid">
        <div v-for="w in listedWishes" :key="w.id" class="wish-row">
          <div class="row-main">
            <el-checkbox
              class="row-check"
              :model-value="selectedWishIds.includes(w.id)"
              @change="(v: boolean | string | number) => toggleWishSelect(w.id, !!v)"
            />
            <div>
              <strong>{{ w.title }}</strong>
              <el-tag
                v-if="w.type === 'golden_finger'"
                size="small"
                class="finger-tag"
                effect="plain"
              >
                家庭互助卡
              </el-tag>
              <div class="muted">
                {{ w.student?.name || w.studentId }} · {{ w.costPoints }} 积分
                <template v-if="w.isNearTerm"> · 近端</template>
                <template v-if="w.type === 'golden_finger'"> · 先缓缓家务</template>
                <template v-else-if="w.kind"> · {{ kindLabel(w.kind) }}</template>
              </div>
            </div>
          </div>
          <div class="row-actions">
            <el-tag :type="w.active ? 'success' : 'info'">{{ w.active ? '上架' : '下架' }}</el-tag>
            <el-button class="tap-btn" text @click="openEdit(w)">编辑</el-button>
            <el-button class="tap-btn" text @click="toggle(w)">
              {{ w.active ? '下架' : '上架' }}
            </el-button>
            <el-button class="tap-btn" text type="danger" @click="removeWish(w)">删除</el-button>
          </div>
        </div>
      </div>
      <div v-if="!listedWishes.length">
        <EmptyState
          title="还没有愿望"
          description="点右下角添加，或等孩子提报后审定上架。家庭互助卡可以兑换「先缓缓一件家务」。"
        />
      </div>
    </div>

    <el-collapse class="history-fold">
      <el-collapse-item name="history">
        <template #title>
          <span>兑换记录 <span class="muted">{{ historyRedeems.length }}</span></span>
        </template>
        <div v-for="r in historyRedeems" :key="r.id" class="redeem-row">
          <div>
            <strong>{{ r.student?.name }}</strong>
            · {{ r.wish?.title }}
            <div class="muted">
              {{ r.costPoints || r.wish?.costPoints || 0 }} 积分 · {{ statusLabel(r.status) }}
              <template v-if="r.status === 'approved' && r.studentAckAt">
                · 孩子已确认收到
              </template>
            </div>
          </div>
          <el-tag v-if="r.status === 'approved' && !r.studentAckAt" type="warning" effect="plain">
            待孩子确认
          </el-tag>
          <el-tag v-else-if="r.status === 'approved'" type="success">已兑现</el-tag>
          <el-tag v-else type="info">再商量</el-tag>
        </div>
        <div v-if="!historyRedeems.length">
          <EmptyState title="还没有兑换记录" description="孩子兑换愿望后，会出现在这里。" />
        </div>
      </el-collapse-item>
    </el-collapse>

    <button
      v-if="isPhone"
      type="button"
      class="wish-fab"
      aria-label="添加愿望"
      @click="dlg = true"
    >
      +
    </button>

    <el-drawer
      v-model="dlg"
      title="添加愿望"
      :direction="isPhone ? 'btt' : 'rtl'"
      :size="isPhone ? 'var(--drawer-phone)' : isTv ? '480px' : '400px'"
    >
      <el-form label-position="top">
        <el-form-item label="学生">
          <el-select v-model="form.studentId" size="large" style="width: 100%">
            <el-option v-for="s in students" :key="s.id" :label="s.name" :value="s.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="标题"><el-input v-model="form.title" size="large" /></el-form-item>
        <el-form-item label="类型">
          <el-radio-group v-model="form.type" size="large">
            <el-radio-button value="normal">普通愿望</el-radio-button>
            <el-radio-button value="golden_finger">家庭互助卡（先缓缓家务）</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item v-if="form.type === 'normal'" label="愿望品类">
          <el-radio-group v-model="form.kind" size="large">
            <el-radio-button value="experience">体验</el-radio-button>
            <el-radio-button value="company">陪伴</el-radio-button>
            <el-radio-button value="choice">选择权</el-radio-button>
            <el-radio-button value="item">物品</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <div v-if="form.type === 'normal'" class="kind-chips">
          <button
            v-for="t in kindTemplates.filter((x) => x.kind === form.kind)"
            :key="t.title"
            type="button"
            class="kind-chip"
            @click="form.title = t.title"
          >
            {{ t.title }}
          </button>
        </div>
        <el-form-item label="所需积分">
          <el-input-number v-model="form.costPoints" :min="1" size="large" />
        </el-form-item>
        <div v-if="form.type === 'normal'" class="kind-chips">
          <button
            v-for="p in (form.isNearTerm ? NEAR_TERM_PRICE_CHIPS : priceChipsFor(form.kind))"
            :key="'c-' + p"
            type="button"
            class="kind-chip"
            @click="form.costPoints = p"
          >
            {{ p }} 分
          </button>
        </div>
        <el-form-item label="近端可兑">
          <el-switch v-model="form.isNearTerm" />
          <span class="muted tiny" style="margin-left: 8px">本周就能够到的小愿望（最多 3 个）</span>
        </el-form-item>
        <p v-if="form.type === 'normal'" class="muted tiny" style="margin: 0 0 6px">
          近端快捷模板（体验 / 陪伴 / 选择权优先）
        </p>
        <div v-if="form.type === 'normal'" class="kind-chips">
          <button
            v-for="t in NEAR_TERM_TEMPLATES"
            :key="'near-' + t.title"
            type="button"
            class="kind-chip"
            @click="applyNearTemplate(t)"
          >
            {{ t.title }}
          </button>
        </div>
        <p v-if="form.type === 'normal'" class="muted finger-hint">
          {{ form.isNearTerm ? '近端建议 5–20 分，体验/陪伴优先。' : priceTalkFor(form.kind) }}
        </p>
        <p v-if="form.type === 'golden_finger'" class="muted finger-hint">
          兑现后今天可先不做一件家务；免做不是责任消失——可改日补做、换一件力所能及的事，或和家人一起分担。
        </p>
      </el-form>
      <template #footer>
        <el-button class="tap-btn full-tap" type="primary" :loading="saving" @click="create">
          保存并上架
        </el-button>
      </template>
    </el-drawer>

    <el-drawer
      v-model="editDlg"
      :title="editForm.mode === 'approve' ? '定积分上架' : '编辑愿望'"
      :direction="isPhone ? 'btt' : 'rtl'"
      :size="isPhone ? 'var(--drawer-phone)' : isTv ? '480px' : '400px'"
    >
      <el-form label-position="top">
        <el-form-item label="标题">
          <el-input v-model="editForm.title" size="large" />
        </el-form-item>
        <el-form-item v-if="editForm.mode === 'edit'" label="类型">
          <el-radio-group v-model="editForm.type" size="large">
            <el-radio-button value="normal">普通愿望</el-radio-button>
            <el-radio-button value="golden_finger">家庭互助卡（先缓缓家务）</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item
          v-if="editForm.type !== 'golden_finger'"
          label="愿望品类"
        >
          <el-radio-group v-model="editForm.kind" size="large">
            <el-radio-button value="experience">体验</el-radio-button>
            <el-radio-button value="company">陪伴</el-radio-button>
            <el-radio-button value="choice">选择权</el-radio-button>
            <el-radio-button value="item">物品</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="所需积分">
          <el-input-number v-model="editForm.costPoints" :min="1" size="large" />
        </el-form-item>
        <el-form-item label="近端可兑">
          <el-switch v-model="editForm.isNearTerm" />
        </el-form-item>
        <div v-if="editForm.type !== 'golden_finger'" class="kind-chips">
          <button
            v-for="p in (editForm.isNearTerm ? NEAR_TERM_PRICE_CHIPS : priceChipsFor(editForm.kind))"
            :key="'e-' + p"
            type="button"
            class="kind-chip"
            @click="editForm.costPoints = p"
          >
            {{ p }} 分
          </button>
        </div>
        <p v-if="editForm.type !== 'golden_finger'" class="muted finger-hint">
          {{ priceTalkFor(editForm.kind) }}
        </p>
      </el-form>
      <template #footer>
        <el-button class="tap-btn full-tap" type="primary" :loading="saving" @click="saveEdit">
          {{ editForm.mode === 'approve' ? '上架到商店' : '保存' }}
        </el-button>
      </template>
    </el-drawer>

    <SoftPrompt
      v-model="rejectPrompt.open"
      :title="rejectPrompt.batch ? '批量先缓缓' : '先缓缓'"
      :message="
        rejectPrompt.batch
          ? `将对已选 ${selectedRedeemIds.length} 条兑换统一说明并退回积分。`
          : '写一句给孩子，说明为什么先缓缓——比单纯退回更有温度。'
      "
      placeholder="例如：这周先把作业节奏稳住，周末再商量"
      confirm-text="发给孩子并退回积分"
      :require-note="true"
      :templates="rejectTemplates"
      @confirm="onRejectConfirm"
    />
    <SoftPrompt
      v-model="reconcilePrompt"
      title="接下来可以这样"
      message="积分已退回。要约个时间当面说，比只留在 App 里更暖。"
      :show-input="false"
      confirm-text="知道了"
      cancel-text="关闭"
      @confirm="reconcilePrompt = false"
    />
    <SoftPrompt
      v-model="approvePrompt.open"
      :title="approvePrompt.title"
      :message="approvePrompt.message"
      :placeholder="approvePrompt.placeholder"
      :confirm-text="approvePrompt.confirmText"
      :cancel-text="approvePrompt.cancelText"
      :show-input="approvePrompt.showInput"
      :require-note="approvePrompt.requireNote"
      :templates="approvePrompt.templates"
      :hint="approvePrompt.hint"
      @confirm="onApproveConfirm"
    />
    <SoftPrompt
      v-model="opsPrompt.open"
      :title="opsPrompt.title"
      :message="opsPrompt.message"
      :confirm-text="opsPrompt.confirmText"
      cancel-text="取消"
      :show-input="false"
      @confirm="onOpsConfirm"
    />
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import http from '../../api/http'
import { useBreakpoint } from '../../composables/useBreakpoint'
import PageSkeleton from '../../components/PageSkeleton.vue'
import { useSocket } from '../../composables/useSocket'
import { friendlyError } from '../../composables/useOnboarding'
import SoftPrompt from '../../components/SoftPrompt.vue'
import {
  buildFingerFulfillSoftCopy,
  buildNormalFulfillSoftCopy,
  matchChoreByNote,
} from '../../composables/fulfillSoftCopy'
import EmptyState from '../../components/EmptyState.vue'
import { labels } from '../../composables/labels'
import { createLoadGate, tryBegin } from '../../composables/asyncGuard'
import {
  NEAR_TERM_TEMPLATES,
  NEAR_TERM_PRICE_CHIPS,
} from '../../composables/nearWishTemplates'

const { isPhone, isTv } = useBreakpoint()
const { on, connect } = useSocket()
const wishes = ref<any[]>([])
const redeems = ref<any[]>([])
const students = ref<any[]>([])
const loading = ref(true)
const saving = ref(false)
const wishesLoadGate = createLoadGate()
const batchBusy = ref(false)
const dlg = ref(false)
const editDlg = ref(false)
const selectedWishIds = ref<number[]>([])
const selectedRedeemIds = ref<number[]>([])
const rejectPrompt = reactive({ open: false, row: null as any, batch: false })
const reconcilePrompt = ref(false)
type ApproveMode =
  | ''
  | 'normal'
  | 'finger'
  | 'fingerPick'
  | 'fingerEmpty'
  | 'createFinger'
  | 'saveFinger'
const approvePrompt = reactive({
  open: false,
  mode: '' as ApproveMode,
  row: null as any,
  chores: [] as any[],
  title: '',
  message: '',
  confirmText: '确定',
  cancelText: '取消',
  showInput: false,
  requireNote: false,
  templates: [] as string[],
  hint: '',
  placeholder: '',
})
const opsPrompt = reactive({
  open: false,
  mode: '' as '' | 'batchRemove' | 'batchFulfill' | 'delete',
  title: '',
  message: '',
  confirmText: '确定',
  wishId: 0,
  redeemNormals: [] as any[],
})
const rejectTemplates = [
  '这周先把节奏稳住，周末再商量',
  '积分先退回，我们一起想个更合适的时机',
  '你已经很努力了，我们换个小愿望试试',
]
const form = reactive({
  studentId: 0,
  title: '',
  costPoints: 15,
  type: 'normal' as 'normal' | 'golden_finger',
  kind: 'experience' as 'item' | 'experience' | 'company' | 'choice',
  isNearTerm: true,
})
const editForm = reactive({
  id: 0,
  mode: 'edit' as 'edit' | 'approve',
  title: '',
  costPoints: 30,
  type: 'normal' as 'normal' | 'golden_finger',
  kind: 'item' as 'item' | 'experience' | 'company' | 'choice',
  isNearTerm: false,
})

const kindTemplates = [
  { kind: 'experience', title: '周末户外一小时' },
  { kind: 'experience', title: '选一部一起看的电影' },
  { kind: 'company', title: '和家长散步聊聊' },
  { kind: 'company', title: '家长读一个睡前故事' },
  { kind: 'choice', title: '决定今晚晚餐一道菜' },
  { kind: 'choice', title: '安排周末一小时自由时间' },
  { kind: 'item', title: '一本想看的书' },
  { kind: 'item', title: '小文具一份' },
]

function applyNearTemplate(t: {
  title: string
  kind: 'company' | 'choice' | 'experience'
  costPoints: number
}) {
  form.type = 'normal'
  form.title = t.title
  form.kind = t.kind
  form.costPoints = t.costPoints
  form.isNearTerm = true
}

const PRICE_BY_KIND: Record<string, number[]> = {
  experience: [20, 30, 50],
  company: [15, 25, 40],
  choice: [10, 20, 30],
  item: [20, 40, 60],
}

function priceChipsFor(kind: string) {
  return PRICE_BY_KIND[kind] || [10, 20, 30]
}

function priceTalkFor(kind: string) {
  return (
    (
      {
        experience: '定分时聊聊：这是一起度过的时间，值多少努力？有没有更轻的替代体验？',
        company: '定分时聊聊：陪伴不可囤积——分数是「一起准备」的仪式，不是买家长的时间。',
        choice: '定分时聊聊：选择权练自主；太大的决定可以拆成小选择。',
        item: '定分时聊聊：稀缺吗？能不能用体验替代？攒多久才值得？',
      } as any
    )[kind] || '定分时和孩子商量：时间成本、稀缺性、能不能用体验替代。'
  )
}

function kindLabel(k: string) {
  return (
    ({ item: '物品', experience: '体验', company: '陪伴', choice: '选择权' } as any)[k] ||
    '愿望'
  )
}

const pendingRedeems = computed(() =>
  redeems.value.filter((r) => r.status === 'pending'),
)
const historyRedeems = computed(() =>
  redeems.value.filter((r) => r.status !== 'pending'),
)
const proposedWishes = computed(() => wishes.value.filter((w) => !!w.proposed))
const listedWishes = computed(() => wishes.value.filter((w) => !w.proposed))

function statusLabel(s: string) {
  return ({ pending: '等家长看看', approved: '已兑现', rejected: '再商量' } as any)[s] || s
}

async function load() {
  const ticket = wishesLoadGate.next()
  loading.value = true
  try {
    const [w, r, s] = await Promise.all([
      http.get('/wishes'),
      http.get('/redeems'),
      http.get('/students'),
    ])
    if (!ticket.isCurrent()) return
    wishes.value = w as any[]
    redeems.value = r as any[]
    students.value = s as any[]
    if (!form.studentId && students.value[0]) form.studentId = students.value[0].id
    const wishAlive = new Set(wishes.value.map((x) => x.id))
    const redeemAlive = new Set(
      redeems.value.filter((x) => x.status === 'pending').map((x) => x.id),
    )
    selectedWishIds.value = selectedWishIds.value.filter((id) => wishAlive.has(id))
    selectedRedeemIds.value = selectedRedeemIds.value.filter((id) => redeemAlive.has(id))
  } catch (e: any) {
    if (!ticket.isCurrent()) return
    ElMessage.error(friendlyError(e, '愿望列表暂时打不开'))
  } finally {
    if (ticket.isCurrent()) loading.value = false
  }
}

function toggleWishSelect(id: number, checked: boolean) {
  if (checked) {
    if (!selectedWishIds.value.includes(id)) selectedWishIds.value = [...selectedWishIds.value, id]
  } else {
    selectedWishIds.value = selectedWishIds.value.filter((x) => x !== id)
  }
}

function toggleRedeemSelect(id: number, checked: boolean) {
  if (checked) {
    if (!selectedRedeemIds.value.includes(id)) {
      selectedRedeemIds.value = [...selectedRedeemIds.value, id]
    }
  } else {
    selectedRedeemIds.value = selectedRedeemIds.value.filter((x) => x !== id)
  }
}

async function batchSetActive(active: boolean) {
  const ids = [...selectedWishIds.value]
  if (!ids.length) return
  batchBusy.value = true
  let ok = 0
  const errors: string[] = []
  try {
    for (const id of ids) {
      const row = listedWishes.value.find((w) => w.id === id)
      if (!row || !!row.active === active) {
        ok++
        continue
      }
      try {
        await http.patch(`/wishes/${id}`, { active })
        ok++
      } catch (e: any) {
        errors.push(`#${id}: ${e.message || '失败'}`)
      }
    }
    if (ok) ElMessage.success(active ? `已上架 ${ok} 个愿望` : `已下架 ${ok} 个愿望`)
    if (errors.length) ElMessage.warning(`${errors.length} 个失败`)
    selectedWishIds.value = []
    await load()
  } finally {
    batchBusy.value = false
  }
}

function batchRemoveWishes() {
  const ids = [...selectedWishIds.value]
  if (!ids.length) return
  opsPrompt.mode = 'batchRemove'
  opsPrompt.title = '批量删除'
  opsPrompt.message = `确定删除已选 ${ids.length} 个愿望？兑换记录会一并清理；有待兑现的将跳过。`
  opsPrompt.confirmText = '删除'
  opsPrompt.open = true
}

async function runBatchRemoveWishes() {
  const ids = [...selectedWishIds.value]
  if (!ids.length) return
  batchBusy.value = true
  let ok = 0
  const errors: string[] = []
  try {
    for (const id of ids) {
      try {
        await http.delete(`/wishes/${id}`)
        ok++
      } catch (e: any) {
        errors.push(`#${id}: ${e.message || '失败'}`)
      }
    }
    if (ok) ElMessage.success(`已删除 ${ok} 个愿望`)
    if (errors.length) ElMessage.warning(`${errors.length} 个失败`)
    selectedWishIds.value = []
    await load()
  } finally {
    batchBusy.value = false
  }
}

function batchApproveRedeems() {
  const ids = [...selectedRedeemIds.value]
  if (!ids.length) return
  const rows = pendingRedeems.value.filter((r) => ids.includes(r.id))
  const normals = rows.filter((r) => r.wish?.type !== 'golden_finger')
  const fingers = rows.length - normals.length
  if (!normals.length) {
    ElMessage.warning('家庭互助卡请单条兑现（需选择免哪件家务）')
    return
  }
  opsPrompt.mode = 'batchFulfill'
  opsPrompt.redeemNormals = normals
  opsPrompt.title = '批量兑现'
  opsPrompt.message =
    `确认批量兑现 ${normals.length} 条普通愿望？` +
    (fingers ? `（已跳过 ${fingers} 条家庭互助卡，请单条处理）` : '') +
    ' 积分已在申请时扣除。'
  opsPrompt.confirmText = '已给到'
  opsPrompt.open = true
}

async function runBatchApproveRedeems() {
  const normals = opsPrompt.redeemNormals
  if (!normals.length) return
  batchBusy.value = true
  let ok = 0
  const errors: string[] = []
  try {
    for (const r of normals) {
      try {
        await http.post(`/redeems/${r.id}/review`, { action: 'approve' })
        ok++
      } catch (e: any) {
        errors.push(`#${r.id}: ${e.message || '失败'}`)
      }
    }
    if (ok) ElMessage.success(`已兑现 ${ok} 条`)
    if (errors.length) ElMessage.warning(`${errors.length} 条失败`)
    selectedRedeemIds.value = []
    await load()
  } finally {
    batchBusy.value = false
  }
}

function openBatchRejectRedeems() {
  if (!selectedRedeemIds.value.length) return
  rejectPrompt.row = null
  rejectPrompt.batch = true
  rejectPrompt.open = true
}

async function create() {
  if (!form.title.trim() || !form.studentId) return ElMessage.warning('请填写完整')
  if (form.type === 'golden_finger') {
    approvePrompt.mode = 'createFinger'
    approvePrompt.row = null
    approvePrompt.chores = []
    approvePrompt.title = '确认添加家庭互助卡'
    approvePrompt.message =
      '家庭互助卡是「先缓缓一件家务」，不是买免做。兑现后仍可改日补做或换一件力所能及的事。确定上架家庭互助卡吗？'
    approvePrompt.confirmText = '仍要上架'
    approvePrompt.cancelText = '改用体验/陪伴'
    approvePrompt.showInput = false
    approvePrompt.requireNote = false
    approvePrompt.templates = []
    approvePrompt.hint = ''
    approvePrompt.placeholder = ''
    approvePrompt.open = true
    return
  }
  await doCreate()
}

async function doCreate() {
  if (!tryBegin(saving)) return
  try {
    await http.post('/wishes', { ...form })
    ElMessage.success('已添加并上架')
    dlg.value = false
    form.title = ''
    form.type = 'normal'
    form.kind = 'experience'
    form.costPoints = form.isNearTerm ? 15 : 30
    await load()
  } catch (e: any) {
    ElMessage.error(e.message)
  } finally {
    saving.value = false
  }
}

function openApprove(w: any) {
  editForm.id = w.id
  editForm.mode = 'approve'
  editForm.title = w.title
  editForm.type = w.type === 'golden_finger' ? 'golden_finger' : 'normal'
  editForm.kind = (w.kind || 'experience') as any
  editForm.isNearTerm = !!w.isNearTerm
  const chips = editForm.isNearTerm
    ? [...NEAR_TERM_PRICE_CHIPS]
    : priceChipsFor(editForm.kind)
  const suggested = Number(w.costPoints) || 0
  editForm.costPoints =
    suggested > 1 ? suggested : chips[1] || chips[0] || 15
  editDlg.value = true
}

function openEdit(w: any) {
  editForm.id = w.id
  editForm.mode = 'edit'
  editForm.title = w.title
  editForm.costPoints = Math.max(1, Number(w.costPoints) || 1)
  editForm.type = w.type === 'golden_finger' ? 'golden_finger' : 'normal'
  editForm.kind = (w.kind || 'experience') as any
  editForm.isNearTerm = !!w.isNearTerm
  editDlg.value = true
}

async function saveEdit() {
  if (!editForm.title.trim()) return ElMessage.warning('请填写标题')
  if (editForm.mode === 'edit' && editForm.type === 'golden_finger') {
    approvePrompt.mode = 'saveFinger'
    approvePrompt.row = null
    approvePrompt.chores = []
    approvePrompt.title = '确认家庭互助卡'
    approvePrompt.message =
      '将保存为家庭互助卡：兑现后可先缓缓一件家务，免做不是责任消失。确定吗？'
    approvePrompt.confirmText = '仍要保存'
    approvePrompt.cancelText = '再想想'
    approvePrompt.showInput = false
    approvePrompt.requireNote = false
    approvePrompt.templates = []
    approvePrompt.hint = ''
    approvePrompt.placeholder = ''
    approvePrompt.open = true
    return
  }
  await doSaveEdit()
}

async function doSaveEdit() {
  if (!tryBegin(saving)) return
  try {
    if (editForm.mode === 'approve') {
      await http.post(`/wishes/${editForm.id}/approve`, {
        title: editForm.title.trim(),
        costPoints: editForm.costPoints,
        kind: editForm.kind,
        isNearTerm: editForm.isNearTerm,
      })
      ElMessage.success('已上架到愿望商店')
    } else {
      await http.patch(`/wishes/${editForm.id}`, {
        title: editForm.title.trim(),
        costPoints: editForm.costPoints,
        type: editForm.type,
        kind: editForm.kind,
        isNearTerm: editForm.isNearTerm,
      })
      ElMessage.success('已保存')
    }
    editDlg.value = false
    await load()
  } catch (e: any) {
    ElMessage.error(friendlyError(e, '保存没成功'))
  } finally {
    saving.value = false
  }
}

function removeWish(w: any) {
  opsPrompt.mode = 'delete'
  opsPrompt.wishId = w.id
  opsPrompt.title = '删除愿望'
  opsPrompt.message = `确定删除愿望「${w.title}」？`
  opsPrompt.confirmText = '删除'
  opsPrompt.open = true
}

async function runRemoveWish() {
  const id = opsPrompt.wishId
  if (!id) return
  try {
    await http.delete(`/wishes/${id}`)
    ElMessage.success('已删除')
    await load()
  } catch (e: any) {
    if (e?.message) ElMessage.error(friendlyError(e))
  }
}

async function onOpsConfirm() {
  const mode = opsPrompt.mode
  opsPrompt.open = false
  if (mode === 'batchRemove') await runBatchRemoveWishes()
  else if (mode === 'batchFulfill') await runBatchApproveRedeems()
  else if (mode === 'delete') await runRemoveWish()
  opsPrompt.mode = ''
  opsPrompt.wishId = 0
  opsPrompt.redeemNormals = []
}

async function toggle(row: any) {
  try {
    await http.patch(`/wishes/${row.id}`, { active: !row.active })
    await load()
  } catch (e: any) {
    ElMessage.error(e.message)
  }
}

async function review(row: any, action: 'approve' | 'reject') {
  if (action === 'reject') {
    rejectPrompt.row = row
    rejectPrompt.batch = false
    rejectPrompt.open = true
    return
  }
  try {
    if (row.wish?.type === 'golden_finger') {
      const chores: any[] = await http.get(
        `/students/${row.studentId}/waivable-chores`,
      )
      approvePrompt.row = row
      approvePrompt.chores = chores
      const copy = buildFingerFulfillSoftCopy(row, chores)
      approvePrompt.mode = copy.mode
      approvePrompt.title = copy.title
      approvePrompt.message = copy.message
      approvePrompt.confirmText = copy.confirmText
      approvePrompt.cancelText = copy.cancelText
      approvePrompt.showInput = copy.showInput
      approvePrompt.requireNote = copy.requireNote
      approvePrompt.templates = copy.templates
      approvePrompt.hint = copy.hint
      approvePrompt.placeholder = copy.placeholder
    } else {
      const copy = buildNormalFulfillSoftCopy(row)
      approvePrompt.mode = copy.mode
      approvePrompt.row = row
      approvePrompt.chores = []
      approvePrompt.title = copy.title
      approvePrompt.message = copy.message
      approvePrompt.confirmText = copy.confirmText
      approvePrompt.cancelText = copy.cancelText
      approvePrompt.showInput = copy.showInput
      approvePrompt.requireNote = copy.requireNote
      approvePrompt.templates = copy.templates
      approvePrompt.hint = copy.hint
      approvePrompt.placeholder = copy.placeholder
    }
    approvePrompt.open = true
  } catch (e: any) {
    ElMessage.error(friendlyError(e, '加载可免家务没成功'))
  }
}

async function onApproveConfirm(note: string) {
  const mode = approvePrompt.mode
  if (mode === 'createFinger') {
    approvePrompt.mode = ''
    await doCreate()
    return
  }
  if (mode === 'saveFinger') {
    approvePrompt.mode = ''
    await doSaveEdit()
    return
  }
  const row = approvePrompt.row
  if (!row || !mode) return
  let targetAssignId: number | undefined
  if (mode === 'fingerPick') {
    const chore = matchChoreByNote(note, approvePrompt.chores)
    if (!chore) {
      ElMessage.warning('请点选一件家务后再兑现')
      approvePrompt.open = true
      return
    }
    targetAssignId = chore.assignId
  } else if (mode === 'finger') {
    targetAssignId = approvePrompt.chores[0]?.assignId
  }
  try {
    await http.post(`/redeems/${row.id}/review`, {
      action: 'approve',
      targetAssignId,
    })
    ElMessage.success(
      row.wish?.type === 'golden_finger'
        ? '家庭互助卡已兑现'
        : '已兑现，一起开心一下',
    )
    await load()
  } catch (e: any) {
    ElMessage.error(friendlyError(e))
  } finally {
    approvePrompt.mode = ''
    approvePrompt.row = null
    approvePrompt.chores = []
  }
}

async function onRejectConfirm(note: string) {
  if (rejectPrompt.batch) {
    const ids = [...selectedRedeemIds.value]
    const rows = pendingRedeems.value.filter((r) => ids.includes(r.id))
    if (!rows.length) return
    batchBusy.value = true
    let ok = 0
    const errors: string[] = []
    try {
      for (const r of rows) {
        try {
          await http.post(`/redeems/${r.id}/review`, { action: 'reject', note })
          ok++
        } catch (e: any) {
          errors.push(`#${r.id}: ${e.message || '失败'}`)
        }
      }
      if (ok) ElMessage.success(`已先缓缓 ${ok} 条，积分已退回`)
      if (errors.length) ElMessage.warning(`${errors.length} 条失败`)
      selectedRedeemIds.value = []
      rejectPrompt.batch = false
      reconcilePrompt.value = true
      await load()
    } finally {
      batchBusy.value = false
    }
    return
  }
  const row = rejectPrompt.row
  if (!row) return
  try {
    await http.post(`/redeems/${row.id}/review`, {
      action: 'reject',
      note,
    })
    ElMessage.success('已先缓缓，积分已退回，孩子会看到你的话')
    reconcilePrompt.value = true
    await load()
  } catch (e: any) {
    ElMessage.error(friendlyError(e))
  }
}

onMounted(() => {
  load()
  connect()
  on('redeem:requested', () => {
    ElMessage.info('孩子申请兑换愿望啦')
    void load()
  })
  on('redeem:acked', () => {
    void load()
  })
  on('wish:proposed', (payload: any) => {
    ElMessage.info(payload?.message || '孩子提了一个愿望')
    void load()
  })
})
</script>

<style scoped>
.lead {
  margin: -4px 0 12px;
  font-size: 0.9rem;
  line-height: 1.45;
}
.action-strip {
  border-color: color-mix(in srgb, var(--accent, #3d8b6e) 22%, var(--line));
}
.list-main h3 {
  margin-top: 0;
}
.history-fold {
  margin-bottom: 16px;
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
.tiny-hint {
  margin: -4px 0 12px;
  font-size: 0.9rem;
}
h3 {
  margin-top: 0;
  font-family: var(--font-display);
  display: flex;
  align-items: center;
  gap: 8px;
}
.wish-row,
.redeem-row {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px 0;
  border-bottom: 1px solid var(--line);
}
.row-main {
  display: flex;
  gap: 10px;
  align-items: flex-start;
}
.row-check {
  margin-top: 2px;
  flex-shrink: 0;
}
.batch-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 10px;
  padding: 10px 12px;
  border-radius: 12px;
  background: #f7f8fa;
  border: 1px solid var(--line);
}
.batch-count {
  font-weight: 600;
}
.batch-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.redeem-row.pending {
  padding: 14px;
  margin-bottom: 8px;
  border: 1px solid var(--warm-line);
  border-radius: 12px;
  background: var(--warm);
  border-bottom: 1px solid var(--warm-line);
}
.row-actions {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}
.finger-tag {
  margin-left: 6px;
  --el-tag-bg-color: #fff8e0;
  --el-tag-border-color: rgba(180, 140, 40, 0.35);
  --el-tag-text-color: #9a7200;
}
.finger-hint {
  margin: -4px 0 12px;
  line-height: 1.45;
  font-size: 0.9rem;
}
.kind-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: -4px 0 12px;
}
.kind-chip {
  border: 1px solid var(--line);
  background: #fff;
  border-radius: 999px;
  padding: 6px 12px;
  cursor: pointer;
  font-size: 0.9rem;
}
@media (min-width: 768px) {
  .wish-row,
  .redeem-row {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }
}
@media (min-width: 1600px) {
  .page-title {
    font-size: 2rem;
  }
}
</style>
