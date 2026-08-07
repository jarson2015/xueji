<template>
  <div class="page">
    <PageSkeleton v-if="loading" :rows="5" />
    <template v-else>
    <div class="page-head">
      <h2 class="page-title" style="margin: 0">家庭公约</h2>
      <el-tag v-if="readonly" effect="plain">只读</el-tag>
    </div>
    <p class="lead muted">
      这些是我们一起定的规则。改规则请家长在「休息约定」或「教育设置」里调整；孩子也可以提议一条，供家长采纳。
    </p>

    <div class="card-panel">
      <h3>休息日</h3>
      <template v-if="covenant.restDaysEnabled">
        <p v-if="covenant.weeklyRestDays?.length">
          每周：{{ weekLabels }}
        </p>
        <p v-else class="muted">暂无固定休息日</p>
        <p v-if="covenant.extraRestDates?.length" class="muted tiny">
          额外：{{ covenant.extraRestDates.join('、') }}
        </p>
        <p class="muted tiny">{{ restPauseHint }}</p>
      </template>
      <p v-else class="muted">家庭暂未启用休息日约定；平常日照常完成任务。</p>
    </div>

    <div class="card-panel">
      <h3>补上进度</h3>
      <p v-if="covenant.makeupEnabled">
        开启中 · 约拿 {{ covenant.makeupDiscountPercent }}% 积分 · 可补最近
        {{ covenant.makeupWindowDays }} 天
      </p>
      <p v-else class="muted">暂未开启补上进度</p>
      <p class="muted tiny">这是「把事情收尾」，不是扣分惩罚。</p>
    </div>

    <div class="card-panel">
      <h3>积分怎么给</h3>
      <p>{{ rewardLabel }}</p>
    </div>

    <el-collapse class="details-fold">
      <el-collapse-item name="more">
        <template #title>
          <span>更多约定细节</span>
        </template>

        <div class="fold-block">
          <h3>分龄体验</h3>
          <p>{{ ageBandLabel }}</p>
        </div>

        <div class="fold-block">
          <h3>轻轻提醒</h3>
          <p>{{ covenant.nudgeHint || '家长可以轻轻提醒，但不会太频繁。' }}</p>
        </div>

        <div class="fold-block">
          <h3>家庭互助卡</h3>
          <p>{{ covenant.goldenFingerNote }}</p>
        </div>

        <div class="fold-block">
          <h3>零花钱</h3>
          <template v-if="covenant.allowanceLedgerEnabled">
            <p>
              开启中
              <template v-if="covenant.allowanceWeeklyCents">
                · 每周建议 {{ formatYuan(covenant.allowanceWeeklyCents) }}
              </template>
              · 超过 {{ formatYuan(covenant.allowanceLargeCents || 5000) }} 的支出会一起确认
              <template v-if="covenant.allowanceSavePercent">
                · 建议先存 {{ covenant.allowanceSavePercent }}%
              </template>
            </p>
            <p v-if="covenant.allowanceNote" class="muted tiny">{{ covenant.allowanceNote }}</p>
            <el-button
              v-if="readonly"
              class="tap-btn"
              text
              type="primary"
              @click="$router.push('/student/allowance')"
            >
              打开我的零花钱
            </el-button>
            <el-button
              v-else
              class="tap-btn"
              text
              type="primary"
              @click="$router.push('/parent/allowance')"
            >
              查看孩子账本
            </el-button>
          </template>
          <p v-else class="muted">
            家庭暂未开启零花钱账本。想练真实用钱，请家长在「教育设置」里打开；学迹积分愿望仍可用。
          </p>
        </div>

        <div class="fold-block">
          <h3>积分约定</h3>
          <template v-if="covenant.pointsPactEnabled">
            <p>
              开启中 · 单笔最多 {{ covenant.pointsPactMaxAmount || 50 }} 积分 · 逾期每天多还 1
              积分（最多 {{ covenant.pointsPactMaxOverdueExtra ?? 30 }}）
              <template v-if="(covenant.pointsPactParentApproveAbove || 0) > 0">
                · 达到 {{ covenant.pointsPactParentApproveAbove }} 积分需家长先同意
              </template>
            </p>
            <p class="muted tiny">
              {{
                covenant.pointsPactNote ||
                '积分可以按约定暂时借用，但积分不是钱，也不能换成零花钱。说到做到，才是这份约定要练的。今日会提醒到期还回；按时还回会鼓励「说到做到」。'
              }}
            </p>
            <el-button
              v-if="readonly"
              class="tap-btn"
              text
              type="primary"
              @click="$router.push('/student/pacts')"
            >
              打开我的积分约定
            </el-button>
            <el-button
              v-else
              class="tap-btn"
              text
              type="primary"
              @click="$router.push('/parent/pacts')"
            >
              查看家庭积分约定
            </el-button>
          </template>
          <p v-else class="muted">
            家庭暂未开启积分约定。积分不是钱；开启后兄妹可按约定暂时借用。请家长在「教育设置」里打开。
          </p>
        </div>

        <div class="fold-block" v-if="covenant.covenantNote">
          <h3>我们还约定</h3>
          <p class="note">{{ covenant.covenantNote }}</p>
        </div>

        <div class="fold-block" v-if="readonly">
          <h3>我想加一条约定</h3>
          <p class="muted tiny">写给家长看，采纳后会出现在「我们还约定」里。</p>
          <el-input
            v-model="proposeText"
            type="textarea"
            :rows="2"
            maxlength="300"
            show-word-limit
            size="large"
            placeholder="例如：周末先完成家务再看动画"
          />
          <el-button
            type="primary"
            class="tap-btn full-tap"
            style="margin-top: 12px"
            :loading="proposing"
            :disabled="!proposeText.trim()"
            @click="submitPropose"
          >
            发给家长看看
          </el-button>
          <div v-if="myProposals.length" class="prop-list">
            <div v-for="p in myProposals" :key="p.id" class="prop-row">
              <span>{{ p.proposedText }}</span>
              <el-tag size="small" :type="proposalTag(p.status)">{{ proposalLabel(p.status) }}</el-tag>
            </div>
          </div>
        </div>

        <div class="fold-block" v-else-if="pendingProposals.length || allProposals.length">
          <h3>孩子提议的约定</h3>
          <p class="muted tiny">采纳后会写进「我们还约定」。</p>
          <div v-for="p in pendingProposals" :key="p.id" class="prop-row pending">
            <div>
              <strong>{{ p.studentName }}</strong>
              <div>{{ p.proposedText }}</div>
            </div>
            <div class="prop-actions">
              <el-button
                type="primary"
                class="tap-btn"
                :loading="actingId === p.id"
                @click="adoptProposal(p)"
              >
                采纳
              </el-button>
              <el-button
                class="tap-btn"
                :disabled="actingId === p.id"
                @click="dismissProposal(p)"
              >
                先不采纳
              </el-button>
            </div>
          </div>
          <div
            v-for="p in allProposals.filter((x) => x.status !== 'pending').slice(0, 5)"
            :key="'d-' + p.id"
            class="prop-row muted"
          >
            <span>{{ p.studentName }}：{{ p.proposedText }}</span>
            <el-tag size="small" :type="proposalTag(p.status)">{{ proposalLabel(p.status) }}</el-tag>
          </div>
        </div>
      </el-collapse-item>
    </el-collapse>

    <div class="card-panel" v-if="thanks.length">
      <h3>本周感谢</h3>
      <p class="muted tiny">来自点赞与鼓励的温暖瞬间</p>
      <div v-for="(t, i) in thanks" :key="i" class="thanks-row">
        <strong>{{ t.title }}</strong>
        <span class="muted">「{{ t.comment }}」</span>
      </div>
    </div>

    <div v-if="!readonly" class="covenant-edit-actions">
      <el-button class="tap-btn" @click="$router.push('/parent/rest-days')">
        休息约定
      </el-button>
      <el-button class="tap-btn" type="primary" @click="$router.push('/parent/family-edu')">
        教育设置
      </el-button>
    </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import http from '../../api/http'
import { useAuthStore } from '../../stores/auth'
import { friendlyError } from '../../composables/useOnboarding'
import { formatYuan } from '../../composables/money'
import { covenantSyncTick } from '../../composables/taskSync'
import PageSkeleton from '../../components/PageSkeleton.vue'
import { createLoadGate } from '../../composables/asyncGuard'

const auth = useAuthStore()
const loading = ref(true)
const covenantLoadGate = createLoadGate()
const readonly = computed(() => auth.user?.role === 'student')
const covenant = reactive<any>({
  weeklyRestDays: [],
  extraRestDates: [],
  restDaysEnabled: false,
  restPauseAll: false,
  restPauseCategories: ['study'],
  makeupEnabled: true,
  makeupDiscountPercent: 60,
  makeupWindowDays: 7,
  rewardMode: 'always',
  ageBand: 'general',
  goldenFingerNote: '',
  covenantNote: '',
  nudgeHint: '',
  allowanceLedgerEnabled: false,
  allowanceWeeklyCents: null,
  allowanceLargeCents: 5000,
  allowanceSavePercent: 0,
  allowanceNote: '',
  pointsPactEnabled: false,
  pointsPactMaxAmount: 50,
  pointsPactMaxActive: 3,
  pointsPactMaxOverdueExtra: 30,
  pointsPactParentApproveAbove: 20,
  pointsPactNote: '',
})
const thanks = ref<{ title: string; comment: string }[]>([])
const proposeText = ref('')
const proposing = ref(false)
const actingId = ref(0)
const myProposals = ref<any[]>([])
const allProposals = ref<any[]>([])
const pendingProposals = computed(() =>
  allProposals.value.filter((p) => p.status === 'pending'),
)

const weekMap = ['日', '一', '二', '三', '四', '五', '六']
const weekLabels = computed(() =>
  (covenant.weeklyRestDays || []).map((d: number) => `周${weekMap[d]}`).join('、'),
)

const restPauseHint = computed(() => {
  if (covenant.restPauseAll) {
    return '休息日暂停全部任务（含一次性）；关掉休息日后会自然恢复。'
  }
  const map: Record<string, string> = {
    study: '学习',
    chore: '家务',
    routine: '习惯',
  }
  const cats = (covenant.restPauseCategories || [])
    .map((c: string) => map[c] || c)
    .join('、')
  return cats
    ? `休息日暂停：${cats}类循环任务；一次性任务仍会出现。`
    : '休息日暂未指定暂停类别。'
})

const rewardLabel = computed(() => {
  const m = covenant.rewardMode
  if (m === 'random') return '随机强化：完成不一定每次都加分，惊喜更耐用'
  if (m === 'weekly_digest') return '周汇总：日常完成先庆祝，打开本周报告时一次性结算积分'
  return '每次完成：打卡通过后发放积分（适合刚开始建立习惯）'
})

const ageBandLabel = computed(() => {
  const a = covenant.ageBand
  if (a === 'young') return '低龄：更大按钮，更短的反思小问'
  if (a === 'teen') return '少年：庆祝更安静，反思更偏「怎么做」与自主'
  return '通用：适合大多数家庭'
})

function proposalLabel(s: string) {
  return ({ pending: '待家长看', adopted: '已采纳', dismissed: '先不采纳' } as any)[s] || s
}

function proposalTag(s: string) {
  return ({ pending: 'warning', adopted: 'success', dismissed: 'info' } as any)[s] || 'info'
}

async function loadProposals() {
  try {
    const res: any = await http.get('/family/covenant/proposals')
    if (readonly.value) {
      myProposals.value = res.items || []
    } else {
      allProposals.value = res.items || []
    }
  } catch {
    myProposals.value = []
    allProposals.value = []
  }
}

async function submitPropose() {
  const text = proposeText.value.trim()
  if (!text) return
  proposing.value = true
  try {
    await http.post('/family/covenant/proposals', { text })
    ElMessage.success('已发给家长')
    proposeText.value = ''
    await loadProposals()
  } catch (e: any) {
    ElMessage.error(friendlyError(e, '发送没成功'))
  } finally {
    proposing.value = false
  }
}

async function adoptProposal(p: any) {
  actingId.value = p.id
  try {
    const res: any = await http.post(`/family/covenant/proposals/${p.id}/adopt`)
    ElMessage.success('已采纳，写进公约了')
    if (res.covenantNote) covenant.covenantNote = res.covenantNote
    await loadProposals()
  } catch (e: any) {
    ElMessage.error(friendlyError(e, '采纳没成功'))
  } finally {
    actingId.value = 0
  }
}

async function dismissProposal(p: any) {
  actingId.value = p.id
  try {
    await http.post(`/family/covenant/proposals/${p.id}/dismiss`)
    ElMessage.success('已记下，先不采纳')
    await loadProposals()
  } catch (e: any) {
    ElMessage.error(friendlyError(e, '操作没成功'))
  } finally {
    actingId.value = 0
  }
}

async function loadAll(opts?: { soft?: boolean }) {
  const soft = !!opts?.soft
  const ticket = covenantLoadGate.next()
  if (!soft) loading.value = true
  try {
    Object.assign(covenant, await http.get('/family/covenant'))
    if (!ticket.isCurrent()) return
    if (covenant.ageBand) localStorage.setItem('ageBand', covenant.ageBand)
    await loadProposals()
    if (!ticket.isCurrent()) return
    if (!soft) {
      try {
        const report: any = await http.get('/reports/weekly')
        const items: any[] = []
        for (const d of report.daily || []) {
          for (const it of d.items || []) {
            if (it.parentLiked || it.parentComment) {
              items.push({
                title: it.title,
                comment: it.parentComment || '点赞',
              })
            }
          }
        }
        thanks.value = items.slice(0, 8)
      } catch {
        thanks.value = []
      }
    }
  } catch (e: any) {
    if (!ticket.isCurrent()) return
    if (!soft) ElMessage.error(friendlyError(e, '公约暂时打不开'))
  } finally {
    if (ticket.isCurrent() && !soft) loading.value = false
  }
}

onMounted(() => {
  void loadAll()
})

watch(covenantSyncTick, () => {
  void loadAll({ soft: true })
})
</script>

<style scoped>
.lead {
  margin: -4px 0 14px;
  line-height: 1.55;
}
h3 {
  margin: 0 0 8px;
  font-family: var(--font-display);
}
.tiny {
  font-size: 0.88rem;
}
.note {
  white-space: pre-wrap;
  line-height: 1.55;
  margin: 0;
}
.thanks-row {
  padding: 10px 0;
  border-bottom: 1px dashed var(--line);
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.full-tap {
  width: 100%;
  margin-top: 8px;
}
.covenant-edit-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 8px;
}
.covenant-edit-actions .tap-btn {
  flex: 1;
  min-width: 140px;
}
.prop-list {
  margin-top: 12px;
}
.prop-row {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  padding: 10px 0;
  border-bottom: 1px dashed var(--line);
}
.prop-row:last-child {
  border-bottom: none;
}
.prop-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.details-fold {
  margin: 4px 0 16px;
  border: none;
}
.details-fold :deep(.el-collapse-item__header) {
  font-weight: 600;
  font-size: 1rem;
}
.fold-block {
  padding: 10px 0 14px;
  border-bottom: 1px dashed var(--line);
}
.fold-block:last-child {
  border-bottom: none;
  padding-bottom: 4px;
}
.fold-block p {
  margin: 0;
  line-height: 1.5;
}
</style>
