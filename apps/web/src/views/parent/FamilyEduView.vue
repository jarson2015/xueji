<template>
  <div class="page">
    <div class="page-head">
      <h2 class="page-title" style="margin: 0">家庭教育设置</h2>
      <div class="page-head-actions">
        <el-button text type="primary" @click="$router.push('/parent/rest-days')">
          休息约定
        </el-button>
        <el-button text type="primary" @click="$router.push('/parent/covenant')">
          预览公约
        </el-button>
      </div>
    </div>
    <p class="lead muted page-lead">
      常用在上；进阶默认收起。改完点底部「保存」才生效。
    </p>

    <p class="edu-tier-label" id="edu-common">常用</p>
    <div class="card-panel">
      <h3>家庭设定起点</h3>
      <p class="lead muted">点卡片只预填下方表单，点「保存」后才生效。可按孩子阶段选一套起点。</p>
      <div class="preset-grid">
        <button
          v-for="p in eduPresets"
          :key="p.id"
          type="button"
          class="preset-card"
          :class="{ active: activePresetId === p.id }"
          @click="applyEduPreset(p.id)"
        >
          <strong>{{ p.title }}</strong>
          <span class="muted tiny">{{ p.description }}</span>
        </button>
      </div>
      <p v-if="presetHint" class="muted tiny-hint preset-hint">{{ presetHint }}</p>
    </div>

    <div class="card-panel">
      <h3>积分与成长</h3>
      <p class="lead muted">习惯稳住后，可以少盯每一次分数，多看过程。</p>
      <div class="makeup-row">
        <span>少比分、多过程</span>
        <el-switch v-model="intrinsicMode" size="large" />
      </div>
      <p class="muted tiny-hint">
        开启后孩子端弱化积分数字，庆祝优先过程与成长句（账本仍记账，可随时关闭）。
      </p>
      <div class="makeup-row">
        <span>加分节奏</span>
        <el-select v-model="rewardMode" size="large" style="min-width: 200px">
          <el-option label="每次完成都加分" value="always" />
          <el-option label="有时加分（约一半）" value="random" />
          <el-option label="周末一起结算（打开周报时发放）" value="weekly_digest" />
        </el-select>
      </div>
      <p v-if="rewardMode === 'always'" class="muted tiny-hint">
        适合刚建立习惯。稳住 2–4 周后，可改成「有时加分」或「周末一起结算」，少一点「为分而做」。
      </p>
      <p v-if="fadeScheduleNote" class="muted tiny-hint">{{ fadeScheduleNote }}</p>
      <div v-if="fadePreselected" class="fade-banner">
        <strong>已为你预选加分节奏</strong>
        <p class="muted" style="margin: 6px 0 10px">
          习惯已坚持一段时间。当前选择是「{{
            rewardMode === 'weekly_digest' ? '周末一起结算' : '有时加分'
          }}」，点下方「保存」后生效。也可改回「每次完成都加分」。
        </p>
        <el-button class="tap-btn" size="small" @click="undoFadePreselect">
          改回每次加分
        </el-button>
      </div>
      <div v-else-if="fadeHint" class="fade-banner">
        <strong>加分节奏建议</strong>
        <p class="muted" style="margin: 6px 0 10px">{{ fadeHint.message }}</p>
        <el-button
          type="primary"
          class="tap-btn"
          size="small"
          @click="applyFadeSuggest"
        >
          一键改为「{{ fadeHint.suggestMode === 'weekly_digest' ? '周末一起结算' : '有时加分' }}」
        </el-button>
      </div>
      <p v-if="rewardMode === 'random'" class="muted tiny-hint">
        完成仍会庆祝，积分有时惊喜出现，少一点「每次必分」的压力。
      </p>
      <p v-if="rewardMode === 'weekly_digest'" class="muted tiny-hint">
        日常完成先庆祝、暂不加分；周六至周一打开 App 或周报时会自动结算待发积分，周报用来看故事与节奏。
      </p>
      <div class="makeup-row">
        <span>孩子年龄段（家庭默认）</span>
        <el-select v-model="ageBand" size="large" style="min-width: 160px">
          <el-option label="低龄（大按钮）" value="young" />
          <el-option label="通用" value="general" />
          <el-option label="少年（更安静庆祝、更多自主文案）" value="teen" />
        </el-select>
      </div>
      <p class="muted tiny-hint">
        混龄家庭可在「学生管理」里为每个孩子单独设年龄段；未单独设置时用这里的默认。
      </p>
    </div>

    <div class="card-panel">
      <h3>作息时段</h3>
      <p class="lead muted">
        默认：起床后 / 放学后 / 晚饭后 / 睡前 / 随时。打开扩展档后可增加上学前、早餐后、午餐后；学生今日仍只突出「这一段」。
      </p>
      <div class="makeup-row">
        <span>启用扩展时段</span>
        <el-switch v-model="slotExtendedEnabled" size="large" />
      </div>
      <p class="muted tiny-hint">
        扩展关掉后，已选扩展时段的任务仍可完成；发布时不再出现这些选项。
      </p>
      <el-collapse v-model="slotClockOpen">
        <el-collapse-item title="高级：调整各时段对应钟点" name="clock">
          <p class="muted tiny-hint" style="margin-bottom: 10px">
            用整点表示区间（左闭右开）。睡前可跨夜，例如 21→6。未列出的钟点归入「随时」。
          </p>
          <div
            v-for="row in slotClockRows"
            :key="row.key"
            class="makeup-row slot-clock-row"
          >
            <span class="slot-clock-label">{{ row.label }}</span>
            <el-input-number
              v-model="row.startHour"
              :min="0"
              :max="23"
              size="large"
            />
            <span class="muted">至</span>
            <el-input-number
              v-model="row.endHour"
              :min="0"
              :max="23"
              size="large"
            />
            <span class="muted">点</span>
          </div>
          <el-button class="tap-btn" @click="resetSlotClock">恢复默认钟点</el-button>
        </el-collapse-item>
      </el-collapse>
    </div>

    <p class="edu-tier-label" id="edu-advanced">进阶</p>
    <p class="muted tiny-hint advanced-lead">不常改；需要时再展开。零花与积分约定仍用总开关。</p>

    <div class="card-panel">
      <el-collapse v-model="advancedOpen" class="rule-fold">
        <el-collapse-item title="打卡与确认" name="checkin">
          <div class="makeup-row">
            <span>打卡后反思小问</span>
            <el-switch v-model="reflectionEnabled" size="large" />
          </div>
          <div class="makeup-row">
            <span>今日可缓做件数</span>
            <el-input-number v-model="dailySkipLimit" :min="0" :max="5" size="large" />
          </div>
          <p class="muted tiny-hint">
            孩子可对「下一件」点今日缓做（不删任务，仅今日不催）。0 表示关闭。
          </p>
          <div class="makeup-row">
            <span>每晚自动通过待确认</span>
            <el-switch v-model="autoConfirmPendingEnabled" size="large" />
          </div>
          <p class="muted tiny-hint">
            默认关闭。开启后，到点自动通过「当日正常打卡」的待确认；补上进度仍需家长手点。
          </p>
          <div v-if="autoConfirmPendingEnabled" class="makeup-row">
            <span>自动确认时间</span>
            <el-time-select
              v-model="autoConfirmPendingTime"
              start="18:00"
              step="00:30"
              end="23:30"
              placeholder="23:30"
              size="large"
              style="min-width: 140px"
            />
          </div>
          <p v-if="autoConfirmPendingEnabled" class="muted tiny-hint">
            按上海时区，建议晚间。本机学迹要保持运行，到点才会自动确认。
          </p>
        </el-collapse-item>
        <el-collapse-item title="公约文案" name="covenant">
          <el-form label-position="top">
            <el-form-item label="家庭互助卡说明（孩子可见）">
              <el-input
                v-model="goldenFingerNote"
                type="textarea"
                :rows="2"
                placeholder="用积分兑换一次免做家务…"
              />
            </el-form-item>
            <el-form-item label="我们还约定（可选）">
              <el-input
                v-model="covenantNote"
                type="textarea"
                :rows="3"
                placeholder="例如：先沟通再改规则；周末一起户外…"
              />
            </el-form-item>
          </el-form>
        </el-collapse-item>
      </el-collapse>
    </div>

    <div class="card-panel">
      <div class="section-switch-head">
        <div>
          <h3>零花钱约定</h3>
          <p class="lead muted" style="margin-bottom: 0">
            与学迹积分完全分开：积分换愿望，零花钱练真实用钱。
          </p>
        </div>
        <div class="makeup-row section-switch">
          <span>打开账本</span>
          <el-switch v-model="allowanceLedgerEnabled" size="large" />
        </div>
      </div>
      <el-collapse v-if="allowanceLedgerEnabled" class="rule-fold">
        <el-collapse-item name="allowance">
          <template #title>
            <span>展开细则</span>
          </template>
          <p class="muted tiny-hint">
            开启后请带孩子建一个存钱目标。建议先存比例会约束孩子花钱：本周先存够，再记账花销。
          </p>
          <div class="makeup-row">
            <span>建议每周零花钱（元）</span>
            <el-input-number
              v-model="allowanceWeeklyYuan"
              :min="0"
              :max="10000"
              :step="5"
              :precision="2"
              size="large"
            />
          </div>
          <div class="makeup-row">
            <span>大额需确认（元）</span>
            <el-input-number
              v-model="allowanceLargeYuan"
              :min="1"
              :max="10000"
              :step="10"
              :precision="2"
              size="large"
            />
          </div>
          <div class="makeup-row">
            <span>建议先存比例</span>
            <el-input-number
              v-model="allowanceSavePercent"
              :min="0"
              :max="50"
              :step="5"
              size="large"
            />
            <span class="muted">%</span>
          </div>
          <p v-if="allowanceSavePercent > 0" class="muted tiny-hint">
            孩子本周需先存约
            {{ ((allowanceWeeklyYuan * allowanceSavePercent) / 100).toFixed(2) }}
            元到目标，才能记账花销（家长代记不受限）。
          </p>
          <el-form label-position="top" style="margin-top: 8px">
            <el-form-item label="零花钱说明（孩子可见）">
              <el-input
                v-model="allowanceNote"
                type="textarea"
                :rows="2"
                placeholder="零花钱和学迹积分是两套…"
              />
            </el-form-item>
          </el-form>
        </el-collapse-item>
      </el-collapse>
    </div>

    <div class="card-panel">
      <div class="section-switch-head">
        <div>
          <h3>积分约定与赠予</h3>
          <p class="lead muted" style="margin-bottom: 0">
            兄妹可借用或赠予积分；积分不是钱，也不能换成零花钱。
          </p>
        </div>
        <div class="makeup-row section-switch">
          <span>打开约定</span>
          <el-switch
            v-model="pointsPactEnabled"
            size="large"
            :disabled="pactBlockedByYoung"
            @change="onPactToggle"
          />
        </div>
      </div>
      <p v-if="pactBlockedByYoung" class="muted tiny-hint warn-hint">
        家庭默认或至少有一个孩子是「低龄」：为保护发展，暂不开放兄妹积分借贷与赠予。请用「一起完成」或共享家务轮值代替。
      </p>
      <p v-else-if="ageBand === 'young'" class="muted tiny-hint warn-hint">
        当前是低龄段：更建议用「一起完成」代替借贷与赠予。
      </p>
      <el-collapse v-if="pointsPactEnabled" class="rule-fold">
        <el-collapse-item name="pacts">
          <template #title>
            <span>展开细则</span>
          </template>
          <p class="muted tiny-hint section-label">借用（说到做到）</p>
          <div class="makeup-row">
            <span>单笔最多借用</span>
            <el-input-number
              v-model="pointsPactMaxAmount"
              :min="1"
              :max="500"
              size="large"
            />
            <span class="muted">积分</span>
          </div>
          <div class="makeup-row">
            <span>每人未结清上限</span>
            <el-input-number
              v-model="pointsPactMaxActive"
              :min="1"
              :max="20"
              size="large"
            />
            <span class="muted">份</span>
          </div>
          <div class="makeup-row">
            <span>逾期补分上限</span>
            <el-input-number
              v-model="pointsPactMaxOverdueExtra"
              :min="0"
              :max="365"
              size="large"
            />
            <span class="muted">分（每天 1 分）</span>
          </div>
          <div class="makeup-row">
            <span>大额借用需家长先同意</span>
            <el-input-number
              v-model="pointsPactParentApproveAbove"
              :min="0"
              :max="500"
              size="large"
            />
            <span class="muted">积分（0=关闭）</span>
          </div>
          <p v-if="ageBand === 'young'" class="muted tiny-hint">
            低龄建议阈值 ≤10：达到即需家长先同意，减少「玩积分金融」。
          </p>

          <p class="muted tiny-hint section-label">赠予（心意分享）</p>
          <p class="muted tiny-hint">
            赠予不要求还回；对方收下后才扣分。大额需家长同意后，仍要对方确认收下。
          </p>
          <div class="makeup-row">
            <span>单笔最多赠予</span>
            <el-input-number
              v-model="pointsGiftMaxAmount"
              :min="1"
              :max="500"
              size="large"
            />
            <span class="muted">积分</span>
          </div>
          <div class="makeup-row">
            <span>大额赠予需家长先同意</span>
            <el-input-number
              v-model="pointsGiftParentApproveAbove"
              :min="0"
              :max="500"
              size="large"
            />
            <span class="muted">积分（0=关闭）</span>
          </div>
          <div class="makeup-row">
            <span>每人每天最多发起</span>
            <el-input-number
              v-model="pointsGiftDailyMax"
              :min="0"
              :max="10"
              size="large"
            />
            <span class="muted">笔（0=禁止发起）</span>
          </div>
          <div class="makeup-row">
            <span>每人每周净送出上限</span>
            <el-input-number
              v-model="pointsGiftWeeklyOutMax"
              :min="0"
              :max="500"
              size="large"
            />
            <span class="muted">积分（已收下累计）</span>
          </div>

          <el-form label-position="top" style="margin-top: 8px">
            <el-form-item label="说明（孩子可见）">
              <el-input
                v-model="pointsPactNote"
                type="textarea"
                :rows="2"
                placeholder="积分可以按约定暂时借用或自愿赠予，但积分不是钱…"
              />
            </el-form-item>
          </el-form>
          <el-button
            class="tap-btn"
            text
            type="primary"
            @click="$router.push('/parent/pacts')"
          >
            查看家庭积分约定与赠予
          </el-button>
        </el-collapse-item>
      </el-collapse>
    </div>

    <el-button
      type="primary"
      class="tap-btn full-tap"
      :loading="saving"
      @click="save"
    >
      保存
    </el-button>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import http from '../../api/http'
import { friendlyError } from '../../composables/useOnboarding'
import { yuanToCents } from '../../composables/money'
import {
  applySettingsFlags,
  useFeatureFlags,
} from '../../composables/useFeatureFlags'
import { bumpTaskSync } from '../../composables/taskSync'
import {
  DEFAULT_CLOCK_BASE,
  DEFAULT_CLOCK_EXTENDED,
  EXTENDED_SLOTS,
  effectiveClockMap,
  labelSlot,
} from '../../composables/timeSlotPolicy'
import { EDU_PRESETS, presetById, type EduPresetId } from '../../composables/eduPresets'
import { settingsToPutPayload } from '../../composables/familySettingsIo'

const eduPresets = EDU_PRESETS
const activePresetId = ref<EduPresetId | ''>('')
const presetHint = ref('')
/** 策略包可预填；本页无 UI，save 时仍 merge 写入 */
const makeupDiscount = ref(50)

function applyEduPreset(id: EduPresetId) {
  const p = presetById(id)
  if (!p) return
  activePresetId.value = id
  rewardMode.value = p.settings.rewardMode
  reflectionEnabled.value = p.settings.reflectionEnabled
  dailySkipLimit.value = p.settings.dailySkipLimit
  makeupDiscount.value = p.settings.makeupDiscountPercent
  if (id === 'minimal_reward') intrinsicMode.value = true
  presetHint.value =
    p.settings.requireConfirmHint || '已预填下方选项，点「保存」后才会写入'
  ElMessage.success(`已套用「${p.title}」设定（尚未保存）；含补上进度比例已预填，保存才生效`)
}

const { refresh: refreshFlags } = useFeatureFlags()

type ClockRow = { key: string; label: string; startHour: number; endHour: number }

const settingsSnapshot = ref<Record<string, any>>({})
const saving = ref(false)
const rewardMode = ref('always')
const intrinsicMode = ref(false)
const ageBand = ref('general')
const reflectionEnabled = ref(true)
const dailySkipLimit = ref(1)
const autoConfirmPendingEnabled = ref(false)
const autoConfirmPendingTime = ref('23:30')
const slotExtendedEnabled = ref(false)
const slotClockOpen = ref<string[]>([])
/** 进阶折叠：已开自动确认时 hydrate 后自动展开「打卡与确认」 */
const advancedOpen = ref<string[]>([])
const slotClockRows = ref<ClockRow[]>([])
const settingsCreatedAt = ref<string | null>(null)

function fillSlotClockRows(
  extended: boolean,
  override?: Record<string, { startHour: number; endHour: number }> | null,
) {
  const map = effectiveClockMap(extended, override)
  const keys = extended
    ? Object.keys(DEFAULT_CLOCK_EXTENDED)
    : Object.keys(DEFAULT_CLOCK_BASE)
  const ordered = extended
    ? [
        'after_wake',
        'after_breakfast',
        'before_school',
        'after_lunch',
        'after_school',
        'after_dinner',
        'bedtime',
      ]
    : ['after_wake', 'after_school', 'after_dinner', 'bedtime']
  slotClockRows.value = ordered
    .filter((k) => keys.includes(k) || map[k])
    .map((k) => ({
      key: k,
      label: labelSlot(k),
      startHour: map[k]?.startHour ?? 0,
      endHour: map[k]?.endHour ?? 0,
    }))
}

function resetSlotClock() {
  fillSlotClockRows(slotExtendedEnabled.value, null)
}

function slotClockPayload() {
  const out: Record<string, { startHour: number; endHour: number }> = {}
  for (const r of slotClockRows.value) {
    if (
      (EXTENDED_SLOTS as readonly string[]).includes(r.key) &&
      !slotExtendedEnabled.value
    ) {
      continue
    }
    out[r.key] = { startHour: r.startHour, endHour: r.endHour }
  }
  return out
}

const fadeHint = computed(() => {
  if (!settingsCreatedAt.value) return null
  const ageDays = Math.floor(
    (Date.now() - new Date(settingsCreatedAt.value).getTime()) / 86400000,
  )
  if (rewardMode.value === 'always') {
    if (ageDays < 7) return null
    return {
      suggestMode: ageDays >= 28 ? ('weekly_digest' as const) : ('random' as const),
      message:
        ageDays >= 28
          ? '习惯已经很稳了。可以试试「周末一起结算」：日常先庆祝，周末一起看故事和积分。'
          : '已经坚持一段时间了。可以试试「有时加分」：完成仍庆祝，积分偶尔惊喜出现。',
    }
  }
  if (rewardMode.value === 'random') {
    if (ageDays < 14) return null
    return {
      suggestMode: 'weekly_digest' as const,
      message:
        '「有时加分」已经陪你们走了一段路。可以试试「周末一起结算」：平日先庆祝完成，周末一起回顾本周故事。',
    }
  }
  return null
})

const fadeScheduleNote = computed(() => {
  if (rewardMode.value === 'always') {
    return '建议路线：先庆祝完成 → 约 1 周后试「有时加分」→ 习惯稳住后试「周末一起结算」。'
  }
  if (rewardMode.value === 'random') {
    return '当前是「有时加分」。稳住约 2 周后可试「周末一起结算」。'
  }
  if (rewardMode.value === 'weekly_digest') {
    return '当前在「周汇总结算」：平日专注过程，周末一起看积分故事。'
  }
  return null
})
const goldenFingerNote = ref('')
const covenantNote = ref('')
const allowanceLedgerEnabled = ref(false)
const allowanceWeeklyYuan = ref(50)
const allowanceLargeYuan = ref(50)
const allowanceSavePercent = ref(0)
const allowanceNote = ref('')
const pointsPactEnabled = ref(false)
const pointsPactMaxAmount = ref(50)
const pointsPactMaxActive = ref(3)
const pointsPactMaxOverdueExtra = ref(30)
const pointsPactParentApproveAbove = ref(20)
const pointsPactNote = ref('')
const pointsGiftMaxAmount = ref(20)
const pointsGiftParentApproveAbove = ref(10)
const pointsGiftDailyMax = ref(1)
const pointsGiftWeeklyOutMax = ref(40)
const hasYoungStudent = ref(false)
const pactBlockedByYoung = computed(
  () => ageBand.value === 'young' || hasYoungStudent.value,
)
const fadePreselected = ref(false)
const fadePreselectFrom = ref('always')

function applyFadeSuggest() {
  if (!fadeHint.value) return
  rewardMode.value = fadeHint.value.suggestMode
  fadePreselected.value = false
  ElMessage.success('已切换，记得点下方「保存」')
}

function undoFadePreselect() {
  rewardMode.value = fadePreselectFrom.value || 'always'
  fadePreselected.value = false
  ElMessage.info('已改回每次加分，保存后生效')
}

function onPactToggle(v: string | number | boolean) {
  if (!v) return
  if (pactBlockedByYoung.value) {
    pointsPactEnabled.value = false
    ElMessage.warning('低龄家庭暂不开放积分借贷与赠予，请用一起完成或轮值代替')
    return
  }
  if (ageBand.value === 'young') {
    if (
      !pointsPactParentApproveAbove.value ||
      pointsPactParentApproveAbove.value > 10
    ) {
      pointsPactParentApproveAbove.value = 10
    }
    ElMessage.info('低龄已建议家长闸 10 分；更推荐一起完成，而不是借贷')
  }
}

watch(
  () => ageBand.value,
  (band) => {
    if (band === 'young' && pointsPactEnabled.value) {
      if (
        !pointsPactParentApproveAbove.value ||
        pointsPactParentApproveAbove.value > 10
      ) {
        pointsPactParentApproveAbove.value = 10
      }
    }
  },
)

watch(
  () => slotExtendedEnabled.value,
  (ext) => {
    fillSlotClockRows(ext, slotClockPayload())
  },
)

function hydrateFromRes(res: any) {
  rewardMode.value = res.rewardMode || 'always'
  intrinsicMode.value = !!res.intrinsicMode
  ageBand.value = res.ageBand || 'general'
  reflectionEnabled.value = res.reflectionEnabled !== false
  dailySkipLimit.value = res.dailySkipLimit ?? 1
  autoConfirmPendingEnabled.value = !!res.autoConfirmPendingEnabled
  autoConfirmPendingTime.value = res.autoConfirmPendingTime || '23:30'
  makeupDiscount.value = res.makeupDiscountPercent ?? 50
  settingsCreatedAt.value = res.createdAt || null
  goldenFingerNote.value = res.goldenFingerNote || ''
  covenantNote.value = res.covenantNote || ''
  allowanceLedgerEnabled.value = !!res.allowanceLedgerEnabled
  allowanceWeeklyYuan.value =
    res.allowanceWeeklyCents != null ? res.allowanceWeeklyCents / 100 : 50
  allowanceLargeYuan.value = (res.allowanceLargeCents ?? 5000) / 100
  allowanceSavePercent.value = res.allowanceSavePercent ?? 0
  allowanceNote.value = res.allowanceNote || ''
  pointsPactEnabled.value = !!res.pointsPactEnabled
  if (pactBlockedByYoung.value && pointsPactEnabled.value) {
    pointsPactEnabled.value = false
  }
  pointsPactMaxAmount.value = res.pointsPactMaxAmount ?? 50
  pointsPactMaxActive.value = res.pointsPactMaxActive ?? 3
  pointsPactMaxOverdueExtra.value = res.pointsPactMaxOverdueExtra ?? 30
  pointsPactParentApproveAbove.value = res.pointsPactParentApproveAbove ?? 20
  pointsPactNote.value = res.pointsPactNote || ''
  pointsGiftMaxAmount.value = res.pointsGiftMaxAmount ?? 20
  pointsGiftParentApproveAbove.value = res.pointsGiftParentApproveAbove ?? 10
  pointsGiftDailyMax.value = res.pointsGiftDailyMax ?? 1
  pointsGiftWeeklyOutMax.value = res.pointsGiftWeeklyOutMax ?? 40
  slotExtendedEnabled.value = !!res.slotExtendedEnabled
  fillSlotClockRows(
    slotExtendedEnabled.value,
    res.slotClockMap || res.slotClockEffective || null,
  )
  advancedOpen.value = autoConfirmPendingEnabled.value ? ['checkin'] : []
}

async function load() {
  try {
    const [res, studentList]: any[] = await Promise.all([
      http.get('/family/settings'),
      http.get('/students').catch(() => []),
    ])
    hasYoungStudent.value = (studentList || []).some(
      (s: any) => s.ageBand === 'young',
    )
    settingsSnapshot.value = settingsToPutPayload(res)
    hydrateFromRes(res)
    localStorage.setItem('ageBand', ageBand.value)
    localStorage.setItem(
      'slotExtendedEnabled',
      slotExtendedEnabled.value ? '1' : '0',
    )
    fadePreselected.value = false
    if (settingsCreatedAt.value) {
      const ageDays = Math.floor(
        (Date.now() - new Date(settingsCreatedAt.value).getTime()) / 86400000,
      )
      if (rewardMode.value === 'always' && ageDays >= 7) {
        fadePreselectFrom.value = 'always'
        rewardMode.value = ageDays >= 28 ? 'weekly_digest' : 'random'
        fadePreselected.value = true
      } else if (rewardMode.value === 'random' && ageDays >= 14) {
        fadePreselectFrom.value = 'random'
        rewardMode.value = 'weekly_digest'
        fadePreselected.value = true
      }
    }
  } catch (e: any) {
    ElMessage.error(friendlyError(e, '设置暂时打不开'))
  }
}

async function save() {
  if (pactBlockedByYoung.value && pointsPactEnabled.value) {
    pointsPactEnabled.value = false
    return ElMessage.warning('低龄家庭不能开启积分约定与赠予，已为你关掉开关')
  }
  saving.value = true
  try {
    const eduPatch = {
      rewardMode: rewardMode.value,
      intrinsicMode: intrinsicMode.value,
      ageBand: ageBand.value,
      reflectionEnabled: reflectionEnabled.value,
      dailySkipLimit: dailySkipLimit.value,
      autoConfirmPendingEnabled: autoConfirmPendingEnabled.value,
      autoConfirmPendingTime: autoConfirmPendingTime.value || '23:30',
      makeupDiscountPercent: makeupDiscount.value,
      goldenFingerNote: goldenFingerNote.value,
      covenantNote: covenantNote.value,
      allowanceLedgerEnabled: allowanceLedgerEnabled.value,
      allowanceWeeklyCents: allowanceLedgerEnabled.value
        ? yuanToCents(allowanceWeeklyYuan.value)
        : null,
      allowanceLargeCents: yuanToCents(allowanceLargeYuan.value),
      allowanceSavePercent: allowanceSavePercent.value,
      allowanceNote: allowanceNote.value,
      pointsPactEnabled: pointsPactEnabled.value,
      pointsPactMaxAmount: pointsPactMaxAmount.value,
      pointsPactMaxActive: pointsPactMaxActive.value,
      pointsPactMaxOverdueExtra: pointsPactMaxOverdueExtra.value,
      pointsPactParentApproveAbove: pointsPactParentApproveAbove.value,
      pointsPactNote: pointsPactNote.value,
      pointsGiftMaxAmount: pointsGiftMaxAmount.value,
      pointsGiftParentApproveAbove: pointsGiftParentApproveAbove.value,
      pointsGiftDailyMax: pointsGiftDailyMax.value,
      pointsGiftWeeklyOutMax: pointsGiftWeeklyOutMax.value,
      slotExtendedEnabled: slotExtendedEnabled.value,
      slotClockMap: slotClockPayload(),
    }
    const saved: any = await http.put('/family/settings', {
      ...settingsSnapshot.value,
      ...eduPatch,
    })
    settingsSnapshot.value = settingsToPutPayload(saved || {
      ...settingsSnapshot.value,
      ...eduPatch,
    })
    applySettingsFlags(saved || {
      allowanceLedgerEnabled: allowanceLedgerEnabled.value,
      pointsPactEnabled: pointsPactEnabled.value,
    })
    void refreshFlags()
    bumpTaskSync()
    fadePreselected.value = false
    if (saved?.slotClockEffective) {
      fillSlotClockRows(
        !!saved.slotExtendedEnabled,
        saved.slotClockMap || saved.slotClockEffective,
      )
    }
    localStorage.setItem(
      'slotExtendedEnabled',
      slotExtendedEnabled.value ? '1' : '0',
    )
    localStorage.setItem('ageBand', ageBand.value)
    ElMessage.success('教育设置已保存')
  } catch (e: any) {
    ElMessage.error(friendlyError(e, '保存没成功'))
  } finally {
    saving.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.page-head-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  align-items: center;
}
.lead {
  margin: 0 0 16px;
  line-height: 1.55;
  color: var(--muted);
}
.page-lead {
  margin: 4px 0 12px;
}
.edu-tier-label {
  margin: 18px 0 8px;
  font-size: 0.78rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  color: var(--muted);
}
.advanced-lead {
  margin: -2px 0 10px;
}
h3 {
  margin: 0 0 12px;
  font-family: var(--font-display);
}
.makeup-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  min-height: var(--tap-min);
  padding: 8px 0;
  border-bottom: 1px dashed var(--line);
}
.slot-clock-row {
  justify-content: flex-start;
}
.slot-clock-label {
  min-width: 4.5em;
  font-weight: 600;
}
.tiny-hint {
  margin: 8px 0 0;
  font-size: 0.9rem;
}
.section-label {
  margin-top: 14px;
  font-weight: 600;
}
.warn-hint {
  color: var(--accent-strong, #b45309) !important;
}
.fade-banner {
  margin: 12px 0;
  padding: 12px 14px;
  border-radius: 12px;
  background: #f7f8fa;
  border: 1px solid var(--line);
}
.full-tap {
  width: 100%;
  margin-top: 8px;
}
.preset-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 10px;
  margin-bottom: 10px;
}
.preset-card {
  text-align: left;
  border: 1px solid var(--line, #e5e5e5);
  border-radius: 12px;
  padding: 12px 14px;
  background: #fff;
  cursor: pointer;
  min-height: var(--tap-min, 48px);
  display: flex;
  flex-direction: column;
  gap: 6px;
  font: inherit;
}
.preset-card.active {
  border-color: var(--accent, #3d8b6e);
  background: var(--accent-soft, #eef6f1);
}
.preset-hint {
  margin-top: 8px;
}
.rule-fold {
  margin-bottom: 16px;
  border: none;
}
.rule-fold :deep(.el-collapse-item__header) {
  font-weight: 600;
  font-size: 1rem;
}
.section-switch-head {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
}
.section-switch-head h3 {
  margin-bottom: 6px;
}
.section-switch {
  border-bottom: none;
  padding: 0;
  min-width: 140px;
}
</style>
