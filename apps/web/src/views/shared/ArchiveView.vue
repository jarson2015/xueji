<template>
  <div class="page">
    <PageSkeleton v-if="loading" :rows="5" />
    <template v-else>
      <div class="page-head">
        <div>
          <h2 class="page-title" style="margin: 0">已放下的任务</h2>
          <p class="muted lead">不是失败，只是这一期不再催促。</p>
        </div>
        <el-select
          v-if="isParent && students.length > 1"
          v-model="studentId"
          size="large"
          style="min-width: 140px"
          @change="load"
        >
          <el-option v-for="s in students" :key="s.id" :label="s.name" :value="s.id" />
        </el-select>
      </div>

      <div v-for="group in groupedRows" :key="group.key" class="archive-group">
        <h3 class="group-title">{{ group.label }} · {{ group.rows.length }}</h3>
        <div v-for="row in group.rows" :key="row.assignId" class="card-panel archive-row">
          <div>
            <strong>{{ row.title }}</strong>
            <div class="muted tiny">
              {{ categoryLabel(row.category) }}
              · {{ scheduleLabel(row.schedule) }}
              <template v-if="isParent && row.studentName"> · {{ row.studentName }}</template>
              <template v-if="row.periodKey"> · {{ row.periodKey }}</template>
            </div>
          </div>
          <el-tag type="info" effect="plain">{{ archivedReasonLabel(row.status) }}</el-tag>
        </div>
      </div>

      <EmptyState
        v-if="!rows.length"
        title="还没有归档记录"
        description="日终归档、家人代完成或过期未收尾的任务会出现在这里。"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import http from '../../api/http'
import { useAuthStore } from '../../stores/auth'
import { friendlyError } from '../../composables/useOnboarding'
import { archivedReasonLabel } from '../../composables/archiveLabels'
import { labelCategory, labelSchedule } from '../../composables/taskLabels'
import EmptyState from '../../components/EmptyState.vue'
import PageSkeleton from '../../components/PageSkeleton.vue'

const auth = useAuthStore()
const isParent = computed(() => auth.user?.role === 'parent')
const loading = ref(true)
const rows = ref<any[]>([])
const students = ref<Array<{ id: number; name: string }>>([])
const studentId = ref(0)

const categoryLabel = labelCategory
const scheduleLabel = labelSchedule

const groupedRows = computed(() => {
  const map = new Map<string, { key: string; label: string; rows: any[] }>()
  for (const row of rows.value) {
    const key = String(row.status || 'other')
    let group = map.get(key)
    if (!group) {
      group = { key, label: archivedReasonLabel(key), rows: [] }
      map.set(key, group)
    }
    group.rows.push(row)
  }
  return [...map.values()]
})

async function load() {
  loading.value = true
  try {
    if (isParent.value) {
      if (!students.value.length) {
        const list: any = await http.get('/students')
        students.value = list
        if (!studentId.value && list.length) studentId.value = list[0].id
      }
      const q = studentId.value ? `?studentId=${studentId.value}` : ''
      rows.value = (await http.get(`/archived-assigns${q}`)) as any[]
    } else {
      rows.value = (await http.get('/my/archived-tasks')) as any[]
    }
  } catch (e: any) {
    ElMessage.error(friendlyError(e, '归档列表暂时打不开'))
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  void load()
})
</script>

<style scoped>
.lead {
  margin: 6px 0 0;
}
.archive-group {
  margin-bottom: 16px;
}
.group-title {
  margin: 0 0 8px;
  font-size: 0.95rem;
  font-family: var(--font-display);
  color: var(--muted, #6b7280);
  font-weight: 600;
}
.archive-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 8px;
}
</style>
