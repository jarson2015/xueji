import { getCurrentInstance, onMounted, reactive, ref } from 'vue'
import http from '../api/http'
import { useAuthStore } from '../stores/auth'

/** Shared module singleton — side nav / More / RestDays stay in sync */
const flags = reactive({
  allowance: false,
  pacts: false,
})
const loading = ref(true)
let refreshPromise: Promise<void> | null = null

async function refresh() {
  if (refreshPromise) return refreshPromise
  refreshPromise = (async () => {
    const auth = useAuthStore()
    const role = auth.user?.role
    if (!role) {
      flags.allowance = false
      flags.pacts = false
      loading.value = false
      return
    }
    try {
      if (role === 'parent') {
        const s: any = await http.get('/family/settings')
        flags.allowance = !!s.allowanceLedgerEnabled
        flags.pacts = !!s.pointsPactEnabled
      } else {
        const [a, p]: any[] = await Promise.all([
          http.get('/allowance/me').catch(() => ({ enabled: false })),
          http.get('/pacts/me').catch(() => ({ enabled: false })),
        ])
        flags.allowance = !!a.enabled
        flags.pacts = !!p.enabled
      }
    } catch {
      flags.allowance = false
      flags.pacts = false
    } finally {
      loading.value = false
    }
  })().finally(() => {
    refreshPromise = null
  })
  return refreshPromise
}

/** Apply flags from a settings DTO (parent save path — avoid extra GET). */
export function applySettingsFlags(s: {
  allowanceLedgerEnabled?: boolean
  pointsPactEnabled?: boolean
}) {
  flags.allowance = !!s.allowanceLedgerEnabled
  flags.pacts = !!s.pointsPactEnabled
}

/** 侧栏/TV 条件导航：零花钱、积分约定（开启后显示） */
export function useFeatureFlags() {
  if (getCurrentInstance()) {
    onMounted(() => {
      void refresh()
    })
  }
  return { flags, loading, refresh }
}
