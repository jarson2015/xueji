<template>
  <!-- 手机 / TV：遮罩抽屉 -->
  <el-drawer
    v-if="!inline"
    :model-value="modelValue"
    :title="panelTitle"
    :direction="isPhone ? 'btt' : 'rtl'"
    :size="isPhone ? 'var(--drawer-phone)' : '440px'"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <ParentTaskFormFields
      :form="form"
      :students="students"
      :editing-id="editingId"
      :slot-option-groups="slotOptionGroups"
      :category-hint="categoryHint"
      :schedule-hint="scheduleHint"
      :confirm-hint="confirmHint"
      :shared-complete-hint="sharedCompleteHint"
      :rotate-hint="rotateHint"
      :theme-suggest-chips="themeSuggestChips"
      :theme-suggest-label="themeSuggestLabel"
    />
    <template #footer>
      <el-button class="tap-btn full-tap" type="primary" :loading="saving" @click="emit('save')">
        {{ editingId ? '保存' : '发布' }}
      </el-button>
    </template>
  </el-drawer>

  <!-- 平板 / 桌面：右侧常驻面板 -->
  <aside v-else class="task-edit-inline card-panel">
    <template v-if="modelValue">
      <div class="inline-head">
        <h3 class="inline-title">{{ panelTitle }}</h3>
        <el-button text class="tap-btn" @click="emit('update:modelValue', false)">关闭</el-button>
      </div>
      <div class="inline-body">
        <ParentTaskFormFields
          :form="form"
          :students="students"
          :editing-id="editingId"
          :slot-option-groups="slotOptionGroups"
          :category-hint="categoryHint"
          :schedule-hint="scheduleHint"
          :confirm-hint="confirmHint"
          :shared-complete-hint="sharedCompleteHint"
          :rotate-hint="rotateHint"
          :theme-suggest-chips="themeSuggestChips"
          :theme-suggest-label="themeSuggestLabel"
        />
      </div>
      <div class="inline-foot">
        <el-button class="tap-btn full-tap" type="primary" :loading="saving" @click="emit('save')">
          {{ editingId ? '保存' : '发布' }}
        </el-button>
      </div>
    </template>
    <div v-else class="inline-empty">
      <strong>对照编辑</strong>
      <p class="muted tiny-hint">
        在左侧点「编辑」改一件任务，或点页头「发布任务」在这里新建。列表不会被挡住。
      </p>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useBreakpoint } from '../composables/useBreakpoint'
import ParentTaskFormFields from './ParentTaskFormFields.vue'
import type { ParentTaskFormModel } from './parentTaskForm'

export type { ParentTaskFormModel }

const props = defineProps<{
  modelValue: boolean
  form: ParentTaskFormModel
  students: Array<{ id: number; name: string }>
  editingId: number
  saving: boolean
  inline?: boolean
  slotOptionGroups: Array<{
    label: string
    options: Array<{ label: string; value: string }>
  }>
  categoryHint: string
  scheduleHint: string
  confirmHint: string
  sharedCompleteHint: string
  rotateHint: string
  themeSuggestChips?: string[]
  themeSuggestLabel?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [v: boolean]
  save: []
}>()

const { isPhone } = useBreakpoint()

const panelTitle = computed(() => (props.editingId ? '编辑任务' : '发布任务'))
</script>

<style scoped>
.task-edit-inline {
  display: flex;
  flex-direction: column;
  min-height: 320px;
  max-height: calc(100vh - 96px);
  position: sticky;
  top: 16px;
  margin: 0;
  overflow: hidden;
}
.inline-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
  flex-shrink: 0;
}
.inline-title {
  margin: 0;
  font-size: 1.05rem;
}
.inline-body {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding-right: 4px;
}
.inline-foot {
  flex-shrink: 0;
  padding-top: 12px;
  border-top: 1px solid var(--line);
  margin-top: 8px;
}
.inline-empty {
  padding: 28px 8px;
  text-align: left;
}
.tiny-hint {
  margin: 8px 0 0;
  font-size: 0.86rem;
  line-height: 1.45;
}
</style>
