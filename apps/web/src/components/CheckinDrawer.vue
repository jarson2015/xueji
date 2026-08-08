<template>
  <el-drawer
    :model-value="modelValue"
    :title="title"
    :direction="isPhone ? 'btt' : 'rtl'"
    :size="isPhone ? 'var(--drawer-phone)' : isTv ? '480px' : '400px'"
    destroy-on-close
    @update:model-value="emit('update:modelValue', $event)"
  >
    <el-form label-position="top" class="checkin-form">
      <el-form-item v-if="form.kind === 'task' && form.targetType !== 'once'" label="完成量">
        <el-input-number v-model="form.value" :min="1" size="large" style="width: 100%" />
      </el-form-item>

      <el-form-item v-if="form.steps?.length" label="完成步骤">
        <el-checkbox-group v-model="form.completedStepIds" class="step-group">
          <el-checkbox
            v-for="s in form.steps"
            :key="s.id"
            :value="s.id"
            class="step-item"
          >
            {{ s.title }}
          </el-checkbox>
        </el-checkbox-group>
      </el-form-item>

      <!-- P1.2：有反思提示时，心情/复盘提到折叠外，一眼可见 -->
      <template v-if="promoteReflection">
        <div v-if="!form.isMakeup" class="reflect-chips mood-chips">
          <div class="reflect-label">开始做之前，感觉怎样？（可选）</div>
          <div class="chip-row">
            <button
              v-for="m in moodOptions"
              :key="m.tag"
              type="button"
              class="reflect-chip mood-chip"
              :class="{ on: form.moodTag === m.tag }"
              @click="emit('toggle-mood', m.tag)"
            >
              {{ m.emoji }} {{ m.label }}
            </button>
          </div>
        </div>
        <div v-if="showFocusReflection && !form.isMakeup" class="reflect-chips focus-reflect">
          <div class="reflect-label">专注完感觉怎样？（可选）</div>
          <div class="chip-row">
            <button
              v-for="c in focusReflectionChips"
              :key="c"
              type="button"
              class="reflect-chip focus-chip"
              :class="{ on: form.focusReflection === c }"
              @click="emit('toggle-focus-chip', c)"
            >
              {{ c }}
            </button>
          </div>
        </div>
        <div v-if="reflectionEnabled && !form.isMakeup" class="reflect-chips">
          <div class="reflect-label">做完时感觉？（可选）</div>
          <div class="chip-row">
            <button
              v-for="c in reflectionChips"
              :key="c"
              type="button"
              class="reflect-chip"
              :class="{ on: form.reflection === c }"
              @click="emit('toggle-chip', c)"
            >
              {{ c }}
            </button>
          </div>
        </div>
        <el-form-item
          v-if="reflectionPrompt && reflectionEnabled && !form.isMakeup"
          :label="reflectionPrompt"
        >
          <el-input
            v-model="form.reflection"
            type="textarea"
            :rows="2"
            size="large"
            placeholder="想多写一句也可以，不写也完全没关系"
          />
        </el-form-item>
        <div
          v-if="showReflectionShare && reflectionEnabled && !form.isMakeup"
          class="share-reflect"
        >
          <el-checkbox
            :model-value="shareReflectionWithParent"
            @update:model-value="emit('update:shareReflectionWithParent', !!$event)"
          >
            也让家长现在看见这句话
          </el-checkbox>
          <p class="muted tiny share-hint">{{ TEEN_REFLECTION_SHARE_HINT }}</p>
        </div>
      </template>

      <el-collapse>
        <el-collapse-item
          :title="promoteReflection ? '可选：照片' : '可选：心情 / 照片 / 复盘'"
          name="optional"
        >
          <template v-if="!promoteReflection">
            <div v-if="!form.isMakeup" class="reflect-chips mood-chips">
              <div class="reflect-label">开始做之前，感觉怎样？（可选）</div>
              <div class="chip-row">
                <button
                  v-for="m in moodOptions"
                  :key="m.tag"
                  type="button"
                  class="reflect-chip mood-chip"
                  :class="{ on: form.moodTag === m.tag }"
                  @click="emit('toggle-mood', m.tag)"
                >
                  {{ m.emoji }} {{ m.label }}
                </button>
              </div>
            </div>

            <div v-if="showFocusReflection && !form.isMakeup" class="reflect-chips focus-reflect">
              <div class="reflect-label">专注完感觉怎样？（可选）</div>
              <div class="chip-row">
                <button
                  v-for="c in focusReflectionChips"
                  :key="c"
                  type="button"
                  class="reflect-chip focus-chip"
                  :class="{ on: form.focusReflection === c }"
                  @click="emit('toggle-focus-chip', c)"
                >
                  {{ c }}
                </button>
              </div>
            </div>

            <div v-if="reflectionEnabled && !form.isMakeup" class="reflect-chips">
              <div class="reflect-label">做完时感觉？（可选）</div>
              <div class="chip-row">
                <button
                  v-for="c in reflectionChips"
                  :key="c"
                  type="button"
                  class="reflect-chip"
                  :class="{ on: form.reflection === c }"
                  @click="emit('toggle-chip', c)"
                >
                  {{ c }}
                </button>
              </div>
            </div>

            <el-form-item
              v-if="reflectionPrompt && reflectionEnabled && !form.isMakeup"
              :label="reflectionPrompt"
            >
              <el-input
                v-model="form.reflection"
                type="textarea"
                :rows="2"
                size="large"
                placeholder="想多写一句也可以，不写也完全没关系"
              />
            </el-form-item>
            <div
              v-if="showReflectionShare && reflectionEnabled && !form.isMakeup"
              class="share-reflect"
            >
              <el-checkbox
                :model-value="shareReflectionWithParent"
                @update:model-value="emit('update:shareReflectionWithParent', !!$event)"
              >
                也让家长现在看见这句话
              </el-checkbox>
              <p class="muted tiny share-hint">{{ TEEN_REFLECTION_SHARE_HINT }}</p>
            </div>
          </template>

          <el-form-item label="照片（可选）" class="proof-photo-item">
            <p class="muted tiny proof-hint">拍一张书桌或作业本就行，会自动压缩，很快</p>
            <div class="proof-photo-row">
              <el-upload
                :show-file-list="false"
                :http-request="onUpload"
                :disabled="uploading"
                accept="image/*"
              >
                <el-button class="tap-btn" :loading="uploading">
                  {{ form.imageUrl ? '重新上传' : '选择照片' }}
                </el-button>
              </el-upload>
              <el-button
                v-if="form.imageUrl"
                text
                type="danger"
                class="tap-btn"
                :disabled="uploading"
                @click="emit('clear-photo')"
              >
                去掉
              </el-button>
            </div>
            <div v-if="form.imageUrl" class="proof-thumb-wrap">
              <img :src="form.imageUrl" alt="已选打卡照片" class="proof-thumb" />
              <span class="muted tiny">已选照片</span>
            </div>
          </el-form-item>
        </el-collapse-item>

        <el-collapse-item title="可选：备注" name="extra">
          <el-form-item label="备注">
            <el-input v-model="form.note" type="textarea" :rows="2" size="large" />
          </el-form-item>
        </el-collapse-item>
      </el-collapse>
    </el-form>
    <template #footer>
      <el-button type="primary" class="tap-btn full-tap" :loading="saving" @click="emit('submit')">
        确认完成
      </el-button>
    </template>
  </el-drawer>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useBreakpoint } from '../composables/useBreakpoint'
import { moodOptionsForBand } from '../composables/ageContentPack'
import { TEEN_REFLECTION_SHARE_HINT } from '../composables/teenPrivacy'

export type CheckinFormModel = {
  kind: string
  targetType?: string
  value: number
  reflection: string
  focusReflection?: string
  moodTag?: string
  note: string
  imageUrl: string
  isMakeup?: boolean
  steps?: Array<{ id: number | string; title: string }>
  completedStepIds: Array<number | string>
  [k: string]: unknown
}

const props = defineProps<{
  modelValue: boolean
  title: string
  form: CheckinFormModel
  reflectionEnabled: boolean
  reflectionPrompt: string
  reflectionChips: string[]
  showFocusReflection?: boolean
  focusReflectionChips?: string[]
  uploading: boolean
  saving: boolean
  ageBand?: string
  /** E4.1：teen 反思分享偏好 */
  shareReflectionWithParent?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [v: boolean]
  'update:shareReflectionWithParent': [v: boolean]
  submit: []
  'toggle-chip': [chip: string]
  'toggle-focus-chip': [chip: string]
  'toggle-mood': [tag: string]
  'clear-photo': []
  upload: [option: { file: File }]
}>()

const { isPhone, isTv } = useBreakpoint()
const moodOptions = computed(() => moodOptionsForBand(props.ageBand))
const showReflectionShare = computed(() => props.ageBand === 'teen')
/**
 * U2.2：默认最短路径 = 量/步骤 → 确认。
 * 仅 general 且有反思提示时把复盘提到折叠外；young/teen 一律收进「可选」。
 */
const promoteReflection = computed(
  () =>
    props.ageBand !== 'young' &&
    props.ageBand !== 'teen' &&
    !!props.reflectionEnabled &&
    !!props.reflectionPrompt?.trim() &&
    !props.form.isMakeup,
)

function onUpload(option: any) {
  emit('upload', option)
}
</script>

<style scoped>
.reflect-chips {
  margin-bottom: 12px;
}
.reflect-label {
  font-size: 0.9rem;
  margin-bottom: 8px;
  color: var(--text-muted, #666);
}
.chip-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.reflect-chip {
  min-height: var(--tap-min, 44px);
  padding: 8px 14px;
  border-radius: 999px;
  border: 1px solid var(--line, #e5e5e5);
  background: var(--surface, #fff);
  font: inherit;
  cursor: pointer;
}
.reflect-chip.on {
  border-color: var(--accent, #3d8b6e);
  background: var(--accent-soft, #eef6f1);
  font-weight: 600;
}
.mood-chip.on {
  border-color: var(--accent, #2f6f4e);
  background: var(--accent-soft, #d8ebe0);
}
.focus-chip.on {
  border-color: var(--accent-strong, #1f4d36);
  background: color-mix(in srgb, var(--accent-soft, #d8ebe0) 70%, #fff);
}
.step-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}
.step-item {
  min-height: var(--tap-min);
  margin-right: 0 !important;
}
.proof-photo-item :deep(.el-form-item__content) {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
}
.proof-hint {
  margin: 0 0 4px;
}
.proof-photo-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.proof-thumb-wrap {
  display: flex;
  align-items: center;
  gap: 10px;
}
.proof-thumb {
  width: 72px;
  height: 72px;
  object-fit: cover;
  border-radius: 8px;
  border: 1px solid var(--line, #e5e5e5);
  background: var(--surface-soft, #f7f7f7);
}
.share-reflect {
  margin: 0 0 12px;
}
.share-hint {
  margin: 6px 0 0;
  line-height: 1.4;
}
</style>
