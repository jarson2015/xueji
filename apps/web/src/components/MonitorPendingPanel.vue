<template>
  <section
    class="card-panel activity pending-action"
    :class="[
      variant === 'phone' ? 'zone-act' : 'tv-pending',
      { 'has-pending': hasPending },
    ]"
    role="region"
    aria-label="待处理"
  >
    <h3 :class="{ 'pending-title': variant === 'phone' }">
      待处理
      <el-tag
        v-if="variant === 'phone' && actionPendingCount"
        type="warning"
        size="small"
        effect="plain"
        class="pending-count-tag"
      >
        {{ actionPendingCount }}
      </el-tag>
    </h3>

    <div v-if="variant === 'phone' && selectedConfirmIds.length" class="batch-bar">
      <span class="batch-count">已选 {{ selectedConfirmIds.length }} 项</span>
      <div class="batch-actions">
        <el-button
          type="primary"
          class="tap-btn"
          :loading="batchBusy"
          @click="$emit('batch-approve')"
        >
          批量通过并点赞
        </el-button>
        <el-button text class="tap-btn" @click="$emit('clear-selection')">取消选择</el-button>
      </div>
    </div>

    <div v-if="confirms.length" class="pending-list">
      <p class="pending-sub muted">待确认打卡</p>
      <div v-for="c in confirms" :key="c.id" class="pending-item">
        <div class="pending-main">
          <el-checkbox
            v-if="variant === 'phone'"
            class="row-check"
            :model-value="selectedConfirmIds.includes(c.id)"
            @change="(v: boolean | string | number) => $emit('toggle-select', c.id, !!v)"
          />
          <img
            v-if="variant === 'phone' && c.imageUrl"
            :src="c.imageUrl"
            class="thumb"
            alt="凭证"
          />
          <div>
            <strong>{{ c.studentName }}</strong>
            · {{ c.taskTitle }}
            <el-tag v-if="c.isMakeup" size="small" type="warning" effect="plain">
              {{ variant === 'phone' ? '补上进度（建议单条确认）' : '补上进度' }}
            </el-tag>
            <div v-if="variant === 'phone' && c.note" class="muted">{{ c.note }}</div>
          </div>
        </div>
        <div class="pending-actions">
          <el-button
            type="primary"
            class="tap-btn"
            :loading="actingId === c.id"
            @click="$emit('approve', c)"
          >
            {{ variant === 'phone' ? '通过并点赞' : '通过' }}
          </el-button>
          <el-button
            class="tap-btn"
            :disabled="actingId === c.id"
            @click="$emit('reject', c)"
          >
            再改改
          </el-button>
        </div>
      </div>
    </div>

    <div v-if="proposals.length" class="pending-list proposal-list">
      <p class="pending-sub muted">孩子想加的小事</p>
      <div v-for="p in proposals" :key="'p-' + p.id" class="pending-item">
        <div class="pending-main">
          <div>
            <strong>{{ p.studentName }}</strong>
            · {{ p.title }}
            <template v-if="variant === 'phone'">
              <div class="muted">
                {{ categoryLabel(p.category) }}
                <template v-if="p.suggestedMinutes"> · 约 {{ p.suggestedMinutes }} 分钟</template>
              </div>
              <div v-if="p.description" class="muted">{{ p.description }}</div>
            </template>
          </div>
        </div>
        <div class="pending-actions">
          <el-button
            type="primary"
            class="tap-btn"
            :loading="proposalBusy === p.id"
            @click="$emit('approve-proposal', p)"
          >
            {{ variant === 'phone' ? '同意加入' : '同意' }}
          </el-button>
          <el-button
            class="tap-btn"
            :disabled="proposalBusy === p.id"
            @click="$emit('reject-proposal', p)"
          >
            再商量
          </el-button>
        </div>
      </div>
    </div>

    <p
      v-if="!confirms.length && !proposals.length"
      class="pending-empty-compact muted"
      role="status"
    >
      <template v-if="variant === 'phone' && childFilterId && familyHasPending">
        当前孩子暂无待处理；切换「全部」可查看其他孩子
      </template>
      <template v-else>暂无待处理{{ variant === 'phone' ? ' · 打卡确认与孩子提议会出现在这里' : '' }}</template>
    </p>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'

export type PendingConfirm = {
  id: number
  studentName?: string
  taskTitle?: string
  imageUrl?: string
  note?: string
  isMakeup?: boolean
}

export type PendingProposal = {
  id: number
  studentName?: string
  title?: string
  category?: string
  suggestedMinutes?: number
  description?: string
}

const props = withDefaults(
  defineProps<{
    variant?: 'phone' | 'tv'
    confirms: PendingConfirm[]
    proposals: PendingProposal[]
    actionPendingCount: number
    selectedConfirmIds?: number[]
    batchBusy?: boolean
    actingId?: number | null
    proposalBusy?: number
    childFilterId?: number | null
    familyConfirmCount?: number
    familyProposalCount?: number
  }>(),
  {
    variant: 'phone',
    selectedConfirmIds: () => [],
    batchBusy: false,
    actingId: null,
    proposalBusy: 0,
    childFilterId: null,
    familyConfirmCount: 0,
    familyProposalCount: 0,
  },
)

defineEmits<{
  'toggle-select': [id: number, checked: boolean]
  'batch-approve': []
  'clear-selection': []
  approve: [c: PendingConfirm]
  reject: [c: PendingConfirm]
  'approve-proposal': [p: PendingProposal]
  'reject-proposal': [p: PendingProposal]
}>()

const hasPending = computed(
  () => props.confirms.length > 0 || props.proposals.length > 0,
)

const familyHasPending = computed(
  () => (props.familyConfirmCount || 0) > 0 || (props.familyProposalCount || 0) > 0,
)

function categoryLabel(c?: string) {
  return ({ study: '学习', chore: '家务', routine: '习惯' } as Record<string, string>)[
    c || ''
  ] || c || '小事'
}
</script>

<style scoped>
.pending-action {
  margin-bottom: 12px;
}
.pending-action.has-pending {
  border-color: color-mix(in srgb, var(--warn, #c47b3a) 45%, var(--line));
  background: linear-gradient(160deg, #fffaf5 0%, #fff 70%);
}
.pending-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 10px;
}
.pending-sub {
  margin: 0 0 6px;
  font-size: 0.88rem;
}
.proposal-list {
  margin-top: 12px;
  padding-top: 8px;
  border-top: 1px dashed var(--line);
}
.pending-count-tag {
  vertical-align: middle;
}
.pending-empty-compact {
  margin: 0;
  padding: 8px 0 2px;
  font-size: 0.92rem;
  text-align: center;
}
.zone-act {
  /* spacing owned by parent page rhythm */
}
.pending-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.pending-item {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px;
  border-radius: 12px;
  background: var(--warm);
  border: 1px solid var(--warm-line);
}
.pending-main {
  display: flex;
  gap: 10px;
  align-items: center;
}
.row-check {
  flex-shrink: 0;
}
.batch-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 12px;
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
.thumb {
  width: 64px;
  height: 64px;
  object-fit: cover;
  border-radius: 10px;
  background: #eee;
}
.pending-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
@media (min-width: 768px) {
  .pending-item {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }
}
@media (max-width: 640px) {
  .pending-actions .tap-btn {
    flex: 1;
  }
}
.tv-pending h3 {
  font-size: 1.35rem;
}
.tv-pending .pending-item {
  padding: 16px;
}
.tv-pending .pending-main {
  font-size: 1.05rem;
}
</style>
