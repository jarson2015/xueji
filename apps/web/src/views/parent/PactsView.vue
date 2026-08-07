<template>
  <div class="page">
    <PageSkeleton v-if="loading" :rows="4" />
    <template v-else>
      <div class="page-head">
        <h2 class="page-title" style="margin: 0">积分约定</h2>
        <el-button text type="primary" @click="$router.push('/parent/family-edu')">
          开关与规则
        </el-button>
      </div>

      <EmptyState
        v-if="!enabled"
        hero
        title="尚未开启积分约定与赠予"
        description="开启后，兄弟姐妹可以约定暂时借用积分，或自愿赠予心意。积分不是钱。"
        action-label="去教育设置打开"
        @action="$router.push('/parent/family-edu')"
      />

      <template v-else>
        <div class="card-panel">
          <p class="lead muted">
            监督借用与赠予：可处理大额家长闸、取消未完成申请；借用还可协助还回或结束约定。赠予收下后不可讨回。
          </p>
          <p v-if="ageBand === 'young'" class="muted tiny warn-hint">
            当前家庭为低龄段：更建议用「一起完成」代替借贷与赠予；大额会先到家长同意。
          </p>
        </div>

        <div
          v-if="pendingLend.length || pendingGift.length"
          class="card-panel pending-panel"
        >
          <h3>
            待你确认
            <el-tag type="warning" size="small">
              {{ pendingLend.length + pendingGift.length }}
            </el-tag>
          </h3>
          <div
            v-for="p in pendingLend"
            :key="'pend-p-' + p.id"
            class="pact-row"
            :class="{
              'focus-row': focusMode === 'parent' && p.status === 'parent_pending',
            }"
            :data-pact-id="p.id"
          >
            <div>
              <el-tag size="small" type="info" effect="plain">借用</el-tag>
              <el-tag size="small" :type="statusType(p.status)" style="margin-left: 6px">
                {{ statusLabel(p.status) }}
              </el-tag>
              <div style="margin-top: 6px">
                <strong>{{ p.borrowerName }}</strong>
                向
                <strong>{{ p.lenderName }}</strong>
                借用 <strong>{{ p.amountPoints }}</strong> 积分
              </div>
              <div class="muted tiny">约定还回日 {{ p.dueDate }}</div>
              <div v-if="p.note" class="muted tiny">{{ p.note }}</div>
            </div>
            <div class="row-actions">
              <el-button
                type="primary"
                class="tap-btn"
                :loading="actingId === p.id"
                @click="parentApprove(p)"
              >
                同意
              </el-button>
              <el-button
                class="tap-btn"
                :disabled="actingId === p.id"
                @click="parentReject(p)"
              >
                婉拒
              </el-button>
              <el-button
                class="tap-btn"
                :disabled="actingId === p.id"
                @click="parentCancel(p)"
              >
                取消申请
              </el-button>
            </div>
          </div>
          <div
            v-for="g in pendingGift"
            :key="'pend-g-' + g.id"
            class="pact-row"
            :class="{
              'focus-row': focusMode === 'parent' && g.status === 'parent_pending',
            }"
            :data-gift-id="g.id"
          >
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
                <strong>{{ g.fromName }}</strong>
                送给
                <strong>{{ g.toName }}</strong>
                <strong>{{ g.amountPoints }}</strong> 积分
              </div>
              <div class="muted tiny">{{ reasonLabel(g.reasonCode) }}</div>
              <div v-if="g.note" class="muted tiny">{{ g.note }}</div>
            </div>
            <div class="row-actions">
              <el-button
                type="primary"
                class="tap-btn"
                :loading="actingId === 'g' + g.id"
                @click="giftParentApprove(g)"
              >
                同意
              </el-button>
              <el-button
                class="tap-btn"
                :disabled="actingId === 'g' + g.id"
                @click="giftParentReject(g)"
              >
                婉拒
              </el-button>
              <el-button
                class="tap-btn"
                @click="giftParentCancel(g)"
              >
                取消申请
              </el-button>
            </div>
          </div>
        </div>

        <div class="mode-tabs">
          <button
            type="button"
            class="mode-tab"
            :class="{ active: filter === 'all' }"
            @click="filter = 'all'"
          >
            全部
          </button>
          <button
            type="button"
            class="mode-tab"
            :class="{ active: filter === 'lend' }"
            @click="filter = 'lend'"
          >
            借用
            <span v-if="lendPendingCount" class="tab-badge">{{ lendPendingCount }}</span>
          </button>
          <button
            type="button"
            class="mode-tab"
            :class="{ active: filter === 'gift' }"
            @click="filter = 'gift'"
          >
            赠予
            <span v-if="giftPendingCount" class="tab-badge">{{ giftPendingCount }}</span>
          </button>
        </div>

        <div
          v-if="filter !== 'gift'"
          class="card-panel"
          ref="listSection"
        >
          <h3>借用约定</h3>
          <EmptyState
            v-if="!listLend.length"
            title="还没有借用约定"
            description="孩子发起借用后，会出现在这里。"
          />
          <div
            v-for="p in listLend"
            :key="'p-' + p.id"
            class="pact-row"
            :data-pact-id="p.id"
          >
            <div>
              <el-tag size="small" type="info" effect="plain">借用</el-tag>
              <el-tag size="small" :type="statusType(p.status)" style="margin-left: 6px">
                {{ statusLabel(p.status) }}
              </el-tag>
              <div style="margin-top: 6px">
                <strong>{{ p.borrowerName }}</strong>
                向
                <strong>{{ p.lenderName }}</strong>
                借用 <strong>{{ p.amountPoints }}</strong> 积分
              </div>
              <div class="muted tiny">约定还回日 {{ p.dueDate }}</div>
              <div v-if="p.status === 'active' && p.overdueExtraDue" class="warn tiny">
                逾期 {{ p.overdueDays }} 天 · 补分 {{ p.overdueExtraDue }} · 应还合计
                {{ p.amountDue }}
              </div>
              <div v-if="p.note" class="muted tiny">{{ p.note }}</div>
            </div>
            <div class="row-actions">
              <el-button
                v-if="p.status === 'pending'"
                class="tap-btn"
                :loading="actingId === p.id"
                @click="parentCancel(p)"
              >
                取消申请
              </el-button>
              <el-button
                v-if="p.status === 'active'"
                type="primary"
                class="tap-btn"
                :loading="actingId === p.id"
                @click="parentRepay(p)"
              >
                协助还回
              </el-button>
              <el-button
                v-if="p.status === 'active'"
                class="tap-btn"
                :disabled="actingId === p.id"
                @click="parentWriteOff(p)"
              >
                结束约定
              </el-button>
            </div>
          </div>
        </div>

        <div
          v-if="filter !== 'lend'"
          class="card-panel"
          ref="giftSection"
        >
          <h3>赠予记录</h3>
          <p class="muted tiny" style="margin: 0 0 12px">
            大额需你先同意后，仍由接收方确认收下才扣分；已完成的赠予不可讨回。
          </p>
          <EmptyState
            v-if="!listGift.length"
            title="还没有赠予记录"
            description="孩子发起赠予后，会出现在这里。"
          />
          <div
            v-for="g in listGift"
            :key="'g-' + g.id"
            class="pact-row"
            :data-gift-id="g.id"
          >
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
                <strong>{{ g.fromName }}</strong>
                送给
                <strong>{{ g.toName }}</strong>
                <strong>{{ g.amountPoints }}</strong> 积分
              </div>
              <div class="muted tiny">{{ reasonLabel(g.reasonCode) }}</div>
              <div v-if="g.note" class="muted tiny">{{ g.note }}</div>
            </div>
            <div class="row-actions">
              <el-button
                v-if="g.status === 'pending'"
                class="tap-btn"
                @click="giftParentCancel(g)"
              >
                取消申请
              </el-button>
            </div>
          </div>
        </div>
      </template>
    </template>

    <SoftPrompt
      v-model="pactPrompt.open"
      :title="pactPrompt.title"
      :message="pactPrompt.message"
      :placeholder="pactPrompt.placeholder"
      :confirm-text="pactPrompt.confirmText"
      :show-input="pactPrompt.showInput"
      :require-note="pactPrompt.requireNote"
      @confirm="onPactPromptConfirm"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import http from '../../api/http'
import { friendlyError } from '../../composables/useOnboarding'
import { pactSyncTick } from '../../composables/taskSync'
import EmptyState from '../../components/EmptyState.vue'
import PageSkeleton from '../../components/PageSkeleton.vue'
import SoftPrompt from '../../components/SoftPrompt.vue'
import { createLoadGate } from '../../composables/asyncGuard'

const reasonMap: Record<string, string> = {
  cheer: '祝贺你',
  wish_help: '帮你凑愿望',
  thanks: '感谢你帮过我',
  other: '其他心意',
}

const route = useRoute()
const router = useRouter()
const loading = ref(true)
const pactsLoadGate = createLoadGate()
const enabled = ref(false)
const ageBand = ref(localStorage.getItem('ageBand') || 'general')
const items = ref<any[]>([])
const giftItems = ref<any[]>([])
const actingId = ref<string | number>(0)
const pactPrompt = reactive({
  open: false,
  mode: '' as '' | 'repay' | 'writeOff',
  pactId: 0,
  title: '',
  message: '',
  placeholder: '',
  confirmText: '确定',
  showInput: false,
  requireNote: false,
})

async function parentRepay(p: any) {
  pactPrompt.mode = 'repay'
  pactPrompt.pactId = p.id
  pactPrompt.title = '协助还回'
  pactPrompt.message = `将从 ${p.borrowerName} 账户还回合计 ${p.amountDue || p.amountPoints} 积分给 ${p.lenderName}。需借用方积分足够。`
  pactPrompt.showInput = false
  pactPrompt.requireNote = false
  pactPrompt.confirmText = '确认还回'
  pactPrompt.placeholder = ''
  pactPrompt.open = true
}

async function parentWriteOff(p: any) {
  pactPrompt.mode = 'writeOff'
  pactPrompt.pactId = p.id
  pactPrompt.title = '结束约定'
  pactPrompt.message =
    '结束约定后不再要求还回（已借出的积分留在借用方）。可写一句说明。'
  pactPrompt.showInput = true
  pactPrompt.requireNote = false
  pactPrompt.confirmText = '结束'
  pactPrompt.placeholder = '可选说明'
  pactPrompt.open = true
}

async function onPactPromptConfirm(note: string) {
  const id = pactPrompt.pactId
  const mode = pactPrompt.mode
  pactPrompt.open = false
  if (!id || !mode) return
  actingId.value = id
  try {
    if (mode === 'repay') {
      await http.post(`/pacts/${id}/parent-repay`)
      ElMessage.success('已还清')
    } else {
      await http.post(`/pacts/${id}/parent-write-off`, {
        note: note || undefined,
      })
      ElMessage.success('约定已结束')
    }
    await load()
  } catch (e: any) {
    ElMessage.error(friendlyError(e, mode === 'repay' ? '还回失败' : '操作失败'))
  } finally {
    actingId.value = 0
  }
}
const focusMode = ref<'parent' | null>(null)
const filter = ref<'all' | 'lend' | 'gift'>('all')
const listSection = ref<HTMLElement | null>(null)
const giftSection = ref<HTMLElement | null>(null)

const lendPendingCount = computed(
  () => items.value.filter((p) => p.status === 'parent_pending').length,
)
const giftPendingCount = computed(
  () => giftItems.value.filter((g) => g.status === 'parent_pending').length,
)
const pendingLend = computed(() =>
  items.value.filter((p) => p.status === 'parent_pending'),
)
const pendingGift = computed(() =>
  giftItems.value.filter((g) => g.status === 'parent_pending'),
)
const listLend = computed(() =>
  items.value.filter((p) => p.status !== 'parent_pending'),
)
const listGift = computed(() =>
  giftItems.value.filter((g) => g.status !== 'parent_pending'),
)

async function applyFocus() {
  if (route.query.tab === 'gift') filter.value = 'gift'
  if (route.query.focus !== 'parent') return
  focusMode.value = 'parent'
  if (!enabled.value) return
  await nextTick()
  const pendingFocus = document.querySelector('.pending-panel .focus-row')
  const giftFocus = giftSection.value?.querySelector('.focus-row')
  const pactFocus = listSection.value?.querySelector('.focus-row')
  const target =
    pendingFocus || giftFocus || pactFocus || listSection.value || giftSection.value
  if (giftFocus && !pendingFocus) filter.value = filter.value === 'lend' ? 'all' : filter.value
  if (target && 'scrollIntoView' in target) {
    ;(target as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'center' })
  }
  const q = { ...route.query }
  delete q.focus
  delete q.tab
  await router.replace({ path: route.path, query: q })
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
  return reasonMap[code] || code
}

async function load(opts?: { soft?: boolean }) {
  const soft = !!opts?.soft
  const ticket = pactsLoadGate.next()
  if (!soft) loading.value = true
  try {
    const [res, gifts]: any[] = await Promise.all([
      http.get('/pacts'),
      http.get('/gifts').catch(() => ({ enabled: false, items: [] })),
    ])
    if (!ticket.isCurrent()) return
    enabled.value = !!res.enabled
    ageBand.value = localStorage.getItem('ageBand') || 'general'
    items.value = res.items || []
    giftItems.value = gifts.items || []
  } catch (e: any) {
    if (!ticket.isCurrent()) return
    if (!soft) ElMessage.error(friendlyError(e, '加载失败'))
  } finally {
    if (ticket.isCurrent() && !soft) loading.value = false
    if (ticket.isCurrent()) await applyFocus()
  }
}

async function parentApprove(p: any) {
  actingId.value = p.id
  try {
    await http.post(`/pacts/${p.id}/parent-approve`)
    ElMessage.success('已同意，等待借出方确认')
    await load()
  } catch (e: any) {
    ElMessage.error(friendlyError(e, '操作失败'))
  } finally {
    actingId.value = 0
  }
}

async function parentReject(p: any) {
  actingId.value = p.id
  try {
    await http.post(`/pacts/${p.id}/parent-reject`)
    ElMessage.success('已婉拒')
    await load()
  } catch (e: any) {
    ElMessage.error(friendlyError(e, '操作失败'))
  } finally {
    actingId.value = 0
  }
}

async function parentCancel(p: any) {
  actingId.value = p.id
  try {
    await http.post(`/pacts/${p.id}/parent-cancel`)
    ElMessage.success('已取消')
    await load()
  } catch (e: any) {
    ElMessage.error(friendlyError(e, '取消失败'))
  } finally {
    actingId.value = 0
  }
}

async function giftParentApprove(g: any) {
  actingId.value = 'g' + g.id
  try {
    await http.post(`/gifts/${g.id}/parent-approve`)
    ElMessage.success('已同意，等待对方收下（此时尚未扣分）')
    await load()
  } catch (e: any) {
    ElMessage.error(friendlyError(e, '操作失败'))
  } finally {
    actingId.value = 0
  }
}

async function giftParentReject(g: any) {
  actingId.value = 'g' + g.id
  try {
    await http.post(`/gifts/${g.id}/parent-reject`)
    ElMessage.success('已婉拒')
    await load()
  } catch (e: any) {
    ElMessage.error(friendlyError(e, '操作失败'))
  } finally {
    actingId.value = 0
  }
}

async function giftParentCancel(g: any) {
  actingId.value = 'g' + g.id
  try {
    await http.post(`/gifts/${g.id}/parent-cancel`)
    ElMessage.success('已取消')
    await load()
  } catch (e: any) {
    ElMessage.error(friendlyError(e, '取消失败'))
  } finally {
    actingId.value = 0
  }
}

onMounted(load)

watch(pactSyncTick, () => {
  void load({ soft: true })
})

watch(
  () => route.query.focus,
  () => {
    if (!loading.value) void applyFocus()
  },
)
</script>

<style scoped>
.lead {
  margin: 0;
  line-height: 1.55;
}
.warn-hint {
  margin: 8px 0 0;
  color: var(--accent-strong, #b45309);
}
.pending-panel {
  border-color: color-mix(in srgb, var(--el-color-warning) 35%, var(--line));
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
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}
.mode-tab.active {
  border-color: var(--el-color-primary);
  background: color-mix(in srgb, var(--el-color-primary) 12%, transparent);
  font-weight: 600;
}
.tab-badge {
  min-width: 1.25rem;
  padding: 0 6px;
  border-radius: 999px;
  background: var(--el-color-warning);
  color: #fff;
  font-size: 0.75rem;
  line-height: 1.25rem;
  font-weight: 600;
}
h3 {
  margin: 0 0 12px;
  font-family: var(--font-display);
}
.tiny {
  font-size: 0.88rem;
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
.warn {
  color: var(--el-color-warning);
  margin-top: 4px;
}
</style>
