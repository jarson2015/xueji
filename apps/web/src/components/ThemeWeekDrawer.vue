<template>
  <el-drawer
    :model-value="modelValue"
    :title="title"
    :direction="isPhone ? 'btt' : 'rtl'"
    :size="isPhone ? 'var(--drawer-phone)' : '400px'"
    class="theme-week-drawer"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <p class="muted tiny" style="margin-top: 0">选一个主题，周末小会可以一起收尾。</p>
    <div class="theme-chips">
      <button
        v-for="p in THEME_WEEK_PRESETS"
        :key="p.code"
        type="button"
        class="theme-chip"
        :class="{ on: draftPreset === p.code }"
        @click="pickPreset(p.code)"
      >
        {{ p.title }}
      </button>
      <button
        type="button"
        class="theme-chip"
        :class="{ on: !draftPreset }"
        @click="pickPreset('')"
      >
        先不定
      </button>
    </div>
    <el-input
      v-if="draftPreset === 'custom'"
      v-model="draftTitle"
      maxlength="40"
      show-word-limit
      size="large"
      placeholder="自定义主题标题"
      style="margin-top: 12px"
    />
    <el-input
      v-model="draftText"
      type="textarea"
      :rows="2"
      maxlength="80"
      show-word-limit
      size="large"
      placeholder="可选：一句本周小目标"
      style="margin-top: 12px"
    />
    <el-button
      type="primary"
      class="tap-btn"
      style="margin-top: 16px; width: 100%"
      :loading="saving"
      @click="save"
    >
      保存本周主题
    </el-button>
    <div v-if="suggestChips.length" class="suggest-block">
      <p class="muted tiny">
        可布置微习惯（点一下打开发布页并预填标题，确认后点「发布」才会创建）
      </p>
      <div class="theme-chips">
        <button
          v-for="s in suggestChips"
          :key="s"
          type="button"
          class="theme-chip"
          @click="emit('suggest', s)"
        >
          {{ s }}
        </button>
      </div>
    </div>
  </el-drawer>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import http from '../api/http'
import { friendlyError } from '../composables/useOnboarding'
import { useBreakpoint } from '../composables/useBreakpoint'
import {
  THEME_WEEK_PRESETS,
  suggestionsForThemePreset,
} from '../composables/themeWeek'

const { isPhone } = useBreakpoint()

const props = withDefaults(
  defineProps<{
    modelValue: boolean
    /** 学生端不传；家长必传 */
    studentId?: number
    title?: string
    themePreset?: string
    themeTitle?: string
    text?: string
  }>(),
  {
    title: '本周主题',
    themePreset: '',
    themeTitle: '',
    text: '',
  },
)

const emit = defineEmits<{
  'update:modelValue': [boolean]
  saved: [
    {
      themePreset: string
      themeTitle: string
      text: string
      weekKey?: string
    },
  ]
  suggest: [string]
}>()

const draftPreset = ref('')
const draftTitle = ref('')
const draftText = ref('')
const saving = ref(false)

const suggestChips = computed(() => suggestionsForThemePreset(draftPreset.value))

watch(
  () => props.modelValue,
  (open) => {
    if (!open) return
    draftPreset.value = props.themePreset || ''
    draftTitle.value = props.themeTitle || ''
    draftText.value = props.text || ''
  },
)

function pickPreset(code: string) {
  draftPreset.value = code
  if (code && code !== 'custom') {
    const hit = THEME_WEEK_PRESETS.find((p) => p.code === code)
    draftTitle.value = hit?.title || ''
  }
  if (!code) draftTitle.value = ''
}

async function save() {
  if (saving.value) return
  saving.value = true
  try {
    const body = {
      text: draftText.value,
      themePreset: draftPreset.value,
      themeTitle: draftTitle.value,
    }
    const url =
      props.studentId != null
        ? `/students/${props.studentId}/weekly-goal`
        : '/my/weekly-goal'
    const res: any = await http.put(url, body)
    emit('saved', {
      themePreset: res.themePreset || '',
      themeTitle: res.themeTitle || '',
      text: res.text || '',
      weekKey: res.weekKey,
    })
    emit('update:modelValue', false)
    ElMessage.success(
      res.themeTitle || res.text ? '本周主题已保存' : '已清空本周主题',
    )
  } catch (e: any) {
    ElMessage.error(friendlyError(e, '保存没成功'))
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.theme-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.theme-chip {
  border: 1px solid var(--line, #d8e0d6);
  background: #fff;
  border-radius: 999px;
  padding: 8px 14px;
  font: inherit;
  cursor: pointer;
  min-height: var(--tap-min, 44px);
}
.theme-chip.on {
  border-color: var(--accent, #3d8b6e);
  background: color-mix(in srgb, var(--accent, #3d8b6e) 12%, #fff);
  font-weight: 600;
}
.suggest-block {
  margin-top: 18px;
  padding-top: 12px;
  border-top: 1px dashed var(--line, #d8e0d6);
}
.tiny {
  font-size: 0.88rem;
}
</style>
