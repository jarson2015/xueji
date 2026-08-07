<template>
  <div
    v-if="visible"
    class="card-panel journal-soft-tip"
    role="status"
  >
    <div class="tip-copy">
      <strong>{{ copy.title }}</strong>
      <p class="muted tiny">{{ copy.message }}</p>
    </div>
    <div class="tip-actions">
      <el-button type="primary" class="tap-btn" @click="go">
        {{ copy.action }}
      </el-button>
      <el-button class="tap-btn" @click="dismiss">先不看</el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import http from '../api/http'
import {
  dismissJournalSoftTip,
  isJournalSoftTipDismissed,
  journalSoftTipCopy,
  journalTipWeekKey,
} from '../composables/journalSoftTip'

const props = defineProps<{
  journalPath: string
  ageBand?: string
}>()

const router = useRouter()
const weekPostCount = ref(0)
const dismissed = ref(isJournalSoftTipDismissed())

const copy = computed(() =>
  journalSoftTipCopy(weekPostCount.value, props.ageBand) || {
    title: '',
    message: '',
    action: '',
  },
)

const visible = computed(
  () => !dismissed.value && weekPostCount.value > 0 && !!copy.value.title,
)

onMounted(async () => {
  if (dismissed.value) return
  try {
    const data: any = await http.get('/journal/activity-hint')
    weekPostCount.value = Number(data?.weekPostCount || 0)
  } catch {
    weekPostCount.value = 0
  }
})

function go() {
  router.push(props.journalPath)
}

function dismiss() {
  dismissJournalSoftTip(journalTipWeekKey())
  dismissed.value = true
}
</script>

<style scoped>
.journal-soft-tip {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}
.tip-copy {
  flex: 1;
  min-width: 0;
}
.tip-copy strong {
  font-family: var(--font-display);
}
.tip-copy .tiny {
  margin: 4px 0 0;
}
.tip-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
</style>
