<template>
  <div
    v-if="visible"
    class="celebrate-mask"
    :class="{ 'is-young': isYoung, 'is-teen': isTeen }"
    @keydown.esc.prevent="close"
  >
    <div
      ref="cardRef"
      class="celebrate-card"
      :class="{ 'is-young': isYoung, 'is-teen': isTeen, quiet }"
      role="dialog"
      aria-modal="true"
      aria-labelledby="celebrate-title"
      tabindex="-1"
    >
      <div class="emoji" :class="{ quiet }">{{ celebrateEmoji }}</div>
      <h2 id="celebrate-title">{{ celebrateTitle }}</h2>
      <!-- 过程优先：主文案在积分之前 -->
      <p class="msg">{{ message || processFallback }}</p>
      <p v-if="growthHint" class="growth" role="status">{{ growthHint }}</p>
      <p v-if="deferredPointsHint" class="muted tiny deferred">{{ deferredPointsHint }}</p>

      <div
        v-if="
          !requireConfirm &&
          !isTeen &&
          pointsAwarded > 0 &&
          !interestMode &&
          !intrinsicMode
        "
        class="points"
        :class="{ soft: true }"
      >
        <span class="points-label">{{ pointsAsideLabel }}</span>
        +{{ pointsAwarded }} {{ pointsUnit }}
      </div>
      <p v-else-if="interestMode && !requireConfirm" class="muted tiny interest-aside">
        兴趣探索完成；星星/积分只是顺便的
      </p>

      <div v-if="!effectiveHideMeta" class="meta muted">
        <span>{{ rhythmLabel }}</span>
        <span v-if="showBalance && !intrinsicMode">{{ pointsUnit }} {{ pointsBalance }}</span>
      </div>
      <div
        v-else-if="pointsBalance != null && showBalance && !intrinsicMode && !isTeen"
        class="meta muted"
      >
        <span>{{ pointsUnit }} {{ pointsBalance }}</span>
      </div>

      <div v-if="nextWish && showWish" class="wish">
        <div class="wish-title">
          {{ nextWish.isNearTerm ? '快到手的小愿望：' : '愿望小目标：' }}{{ nextWish.title }}
        </div>
        <el-progress
          :percentage="wishPercent"
          :stroke-width="10"
          color="var(--accent)"
        />
        <div class="muted tiny">
          {{
            nextWish.lackPoints > 0
              ? nextWish.isNearTerm
                ? `再靠近一点点就能和家人商量兑现`
                : `还差一些就可以和家人商量兑现`
              : '可以和家长商量兑现啦'
          }}
        </div>
      </div>
      <el-button
        v-if="nextWish && nextWish.lackPoints <= 0 && !requireConfirm && showWish"
        type="default"
        class="tap-btn full-tap"
        @click="goRewards"
      >
        去看看愿望
      </el-button>
      <el-button
        type="primary"
        class="tap-btn full-tap celebrate-cta"
        style="margin-top: 8px"
        @click="close"
      >
        {{ isYoung ? '再来一件' : '继续' }}
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { getAgeContentPack } from '../composables/ageContentPack'
import { pointsUnitLabel } from '../composables/pointsNarrative'

const props = withDefaults(
  defineProps<{
    visible: boolean
    message: string
    pointsAwarded: number
    pointsBalance: number
    streak: number
    requireConfirm: boolean
    nextWish: {
      title: string
      costPoints: number
      lackPoints: number
      isNearTerm?: boolean
    } | null
    /** Teen mode: quieter celebration */
    quiet?: boolean
    /** Hide streak/rhythm row */
    hideMeta?: boolean
    /** always | random | weekly_digest — 影响「先庆祝」提示 */
    rewardMode?: string
    /** 过程/成长归因句 */
    growthHint?: string
    /** 兴趣任务：弱化积分展示 */
    interestMode?: boolean
    intrinsicMode?: boolean
    /** young | general | teen */
    ageBand?: string
  }>(),
  {
    quiet: false,
    hideMeta: false,
    rewardMode: 'always',
    growthHint: '',
    interestMode: false,
    intrinsicMode: false,
    ageBand: 'general',
  },
)

const emit = defineEmits<{ close: [] }>()
const router = useRouter()
const cardRef = ref<HTMLElement | null>(null)

const agePack = computed(() => getAgeContentPack(props.ageBand))
/** U2.3：跟 ageContentPack.celebrateTone */
const isYoung = computed(
  () => agePack.value.celebrateTone === 'co_regulate' || props.ageBand === 'young',
)
const isTeen = computed(
  () =>
    agePack.value.celebrateTone === 'quiet' ||
    props.quiet ||
    props.ageBand === 'teen',
)
const effectiveHideMeta = computed(
  () => props.hideMeta || (isTeen.value && !props.requireConfirm),
)

const celebrateEmoji = computed(() => {
  if (props.requireConfirm) return '👀'
  if (isTeen.value) return '✓'
  if (isYoung.value) return '⭐'
  return '🎉'
})

const celebrateTitle = computed(() => {
  if (props.requireConfirm) return '已交给家长'
  if (isTeen.value) return '完成'
  if (isYoung.value) return '真棒！'
  return '太棒了！'
})

const processFallback = computed(() => {
  if (props.requireConfirm) return '你已经认真做完了，等家长看一眼就好。'
  if (isYoung.value) return '你做到了，这比分数更重要。我们一起慢慢来。'
  if (isTeen.value) return '这件事你安排完了。'
  return '这件事你做到了，这比分数更重要。'
})

const deferredPointsHint = computed(() => {
  if (props.requireConfirm || props.pointsAwarded > 0) return ''
  if (props.rewardMode === 'weekly_digest') {
    return '先庆祝；积分会在周报里一起结算。'
  }
  if (props.rewardMode === 'random') {
    return '先庆祝；积分有时会惊喜出现，做完本身就很好。'
  }
  return ''
})

const rhythmLabel = computed(() => {
  const n = props.streak || 0
  if (n <= 0) return '今天也有完成'
  if (n === 1) return '今天开启了好节奏'
  if (n < 7) return `最近 ${n} 天有在坚持`
  return `这阵子节奏不错（约 ${n} 天有完成）`
})

const showBalance = computed(
  () =>
    !isTeen.value &&
    !agePack.value.balanceDeemphasized &&
    props.pointsAwarded > 0 &&
    !props.interestMode,
)
const showWish = computed(
  () =>
    !isTeen.value &&
    !props.interestMode &&
    (props.pointsAwarded > 0 || (props.nextWish?.lackPoints ?? 1) <= 0),
)
const pointsUnit = computed(() => pointsUnitLabel(props.ageBand || 'general'))
const pointsAsideLabel = computed(() =>
  isYoung.value ? '顺便点亮' : '顺便得到',
)

const wishPercent = computed(() => {
  if (!props.nextWish?.costPoints) return 0
  const have = props.nextWish.costPoints - props.nextWish.lackPoints
  return Math.min(100, Math.round((have / props.nextWish.costPoints) * 100))
})

function close() {
  emit('close')
}

function goRewards() {
  emit('close')
  router.push('/student/rewards')
}

watch(
  () => props.visible,
  async (v) => {
    if (v) {
      await nextTick()
      cardRef.value?.focus()
    }
  },
)
</script>

<style scoped>
.celebrate-mask {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: rgba(28, 43, 36, 0.45);
  display: grid;
  place-items: center;
  padding: 20px;
}
.celebrate-mask.is-young {
  background:
    radial-gradient(circle at 50% 30%, var(--celebrate-glow, rgba(47, 111, 78, 0.28)), transparent 55%),
    rgba(28, 43, 36, 0.4);
}
.celebrate-card {
  width: min(420px, 100%);
  background: #fff;
  border-radius: 24px;
  padding: 28px 22px;
  text-align: center;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.18);
  animation: pop 0.35s ease;
  outline: none;
}
.celebrate-card.is-young {
  background: linear-gradient(180deg, var(--celebrate-warm, #fff6e8) 0%, #fff 48%);
  border-radius: var(--young-radius, 20px);
  padding: 32px 24px;
  box-shadow: 0 22px 48px var(--celebrate-glow, rgba(47, 111, 78, 0.22));
}
.celebrate-card.is-teen,
.celebrate-card.quiet {
  padding: 22px 20px;
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.12);
}
@media (min-width: 1600px) {
  .celebrate-card {
    width: min(560px, 92vw);
    padding: 40px 32px;
  }
  h2 {
    font-size: 2rem;
  }
  .emoji {
    font-size: 4rem;
  }
}
@keyframes pop {
  from {
    transform: scale(0.9);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}
.emoji {
  font-size: 3rem;
  line-height: 1;
}
.celebrate-card.is-young .emoji {
  font-size: 3.6rem;
}
.emoji.quiet {
  font-size: 1.8rem;
}
h2 {
  margin: 10px 0 6px;
  font-size: 1.6rem;
  color: var(--accent);
  font-family: var(--font-display);
}
.celebrate-card.is-young h2 {
  font-size: 1.85rem;
  color: var(--accent-strong, #1f4d36);
}
.msg {
  margin: 0 0 8px;
  color: var(--ink);
  font-size: 1.05rem;
}
.celebrate-card.is-young .msg {
  font-size: 1.12rem;
}
.growth {
  margin: 0 0 12px;
  padding: 10px 12px;
  border-radius: 12px;
  background: var(--accent-soft, #eef6f1);
  color: var(--accent-strong, #2f6f4e);
  font-size: 0.98rem;
  font-weight: 600;
  line-height: 1.4;
}
.celebrate-card.is-young .growth {
  border-radius: var(--young-radius, 20px);
  background: rgba(47, 111, 78, 0.1);
}
.deferred {
  margin: 0 0 12px;
}
.tiny {
  font-size: 0.9rem;
}
.interest-aside {
  margin: 0 0 12px;
  font-size: 0.9rem;
}
.points {
  font-size: 1.35rem;
  font-weight: 700;
  color: var(--accent);
  margin-bottom: 10px;
}
.points.soft {
  font-size: 1.15rem;
  font-weight: 600;
}
.points-label {
  display: block;
  font-size: 0.8rem;
  font-weight: 500;
  color: var(--muted, #6b7280);
  margin-bottom: 2px;
}
.meta {
  display: flex;
  justify-content: center;
  gap: 16px;
  margin-bottom: 14px;
  flex-wrap: wrap;
}
.wish {
  text-align: left;
  background: var(--accent-soft);
  border-radius: 14px;
  padding: 12px 14px;
  margin-bottom: 16px;
}
.wish-title {
  font-weight: 600;
  margin-bottom: 8px;
  font-size: 0.95rem;
}
.celebrate-card.is-young .celebrate-cta {
  min-height: var(--tap-young-min, 56px);
  font-size: 1.15rem;
}
@media (prefers-reduced-motion: reduce) {
  .celebrate-card {
    animation: none;
  }
}
</style>
