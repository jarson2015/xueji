<template>
  <div class="page" v-loading="loading">
    <div class="page-head">
      <h2 class="page-title" style="margin: 0">学生管理</h2>
      <el-button type="primary" class="tap-btn" @click="openCreate">添加学生</el-button>
    </div>

    <p class="lead muted">把登录码给孩子，就能用 8 位数字进入「今日」。完整码仅在生成/刷新时显示一次。</p>

    <!-- P2：孩子优先 —— 日常管码 / 帮进今日 -->
    <div v-if="!loading && !list.length" class="card-panel empty-hero">
      <h3>还没有孩子</h3>
      <p class="muted">添加后会生成登录码，复制发给孩子即可。</p>
      <el-button type="primary" class="tap-btn" @click="openCreate">添加第一个孩子</el-button>
    </div>

    <!-- P5.2：宽屏主从 —— 左选娃 · 右登录码 -->
    <div v-else-if="useStudentSplit" class="students-shell is-split">
      <div class="students-side">
        <button
          v-for="s in list"
          :key="s.id"
          type="button"
          class="student-pick"
          :class="{ active: selectedStudentId === s.id }"
          @click="selectedStudentId = s.id"
        >
          <strong>{{ s.name }}</strong>
          <span class="muted tiny">
            {{ codeLabel(s) }}
            <template v-if="s.ageBand"> · {{ ageBandLabel(s.ageBand) }}</template>
          </span>
        </button>
      </div>
      <aside v-if="selectedStudent" class="student-detail card-panel">
        <div class="card-top">
          <div>
            <h3>{{ selectedStudent.name }}</h3>
            <p class="muted meta">
              账号 {{ selectedStudent.username }}
              <span v-if="selectedStudent.birthOrder"> · 排行 {{ selectedStudent.birthOrder }}</span>
            </p>
          </div>
          <el-tag effect="plain" type="success">{{ selectedStudent.pointsBalance }} 积分</el-tag>
        </div>
        <div class="code-hero">
          <span class="muted code-label">登录码</span>
          <div class="code">{{ displayCode(selectedStudent) || '—' }}</div>
          <div class="muted expiry" v-if="selectedStudent.loginCodeExpiresAt">
            {{ expiryText(selectedStudent.loginCodeExpiresAt) }}
          </div>
          <p v-if="!displayCode(selectedStudent) && selectedStudent.hasLoginCode" class="muted tiny">
            完整码仅在刷新后显示；点「刷新登录码」可查看新码
          </p>
          <el-button
            type="primary"
            class="tap-btn full-tap"
            :disabled="!displayCode(selectedStudent)"
            @click="copyCode(selectedStudent)"
          >
            复制登录码
          </el-button>
          <LoginCodeQr
            v-if="displayCode(selectedStudent)"
            :code="displayCode(selectedStudent)!"
          />
          <el-button
            class="tap-btn full-tap enter-as-btn"
            :disabled="!canEnterAs(selectedStudent)"
            :loading="enteringId === selectedStudent.id"
            @click="enterAs(selectedStudent)"
          >
            帮孩子进入今日
          </el-button>
        </div>
        <div class="more-row">
          <el-dropdown trigger="click" @command="(cmd) => onMore(String(cmd), selectedStudent)">
            <el-button class="tap-btn" text>更多操作</el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="enter">帮孩子进入今日</el-dropdown-item>
                <el-dropdown-item command="refresh">刷新登录码</el-dropdown-item>
                <el-dropdown-item command="birth">设置家里排行</el-dropdown-item>
                <el-dropdown-item command="age">设置年龄段</el-dropdown-item>
                <el-dropdown-item command="reset">重置密码</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </aside>
    </div>

    <!-- 手机 / TV：整卡列表 -->
    <div v-else class="student-grid">
      <div v-for="s in list" :key="s.id" class="card-panel student-card">
        <div class="card-top">
          <div>
            <h3>{{ s.name }}</h3>
            <p class="muted meta">
              账号 {{ s.username }}
              <span v-if="s.birthOrder"> · 排行 {{ s.birthOrder }}</span>
              <span v-if="s.ageBand"> · {{ ageBandLabel(s.ageBand) }}</span>
            </p>
          </div>
          <el-tag effect="plain" type="success">{{ s.pointsBalance }} 积分</el-tag>
        </div>

        <div class="code-hero">
          <span class="muted code-label">登录码</span>
          <div class="code">{{ displayCode(s) || '—' }}</div>
          <div class="muted expiry" v-if="s.loginCodeExpiresAt">
            {{ expiryText(s.loginCodeExpiresAt) }}
          </div>
          <p v-if="!displayCode(s) && s.hasLoginCode" class="muted tiny">
            完整码仅在刷新后显示；点「刷新登录码」可查看新码
          </p>
          <el-button
            type="primary"
            class="tap-btn full-tap"
            :disabled="!displayCode(s)"
            @click="copyCode(s)"
          >
            复制登录码
          </el-button>
          <LoginCodeQr v-if="displayCode(s)" :code="displayCode(s)!" />
          <el-button
            class="tap-btn full-tap enter-as-btn"
            :disabled="!canEnterAs(s)"
            :loading="enteringId === s.id"
            @click="enterAs(s)"
          >
            帮孩子进入今日
          </el-button>
        </div>

        <div class="more-row">
          <el-dropdown trigger="click" @command="(cmd) => onMore(String(cmd), s)">
            <el-button class="tap-btn" text>更多操作</el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="enter">帮孩子进入今日</el-dropdown-item>
                <el-dropdown-item command="refresh">刷新登录码</el-dropdown-item>
                <el-dropdown-item command="birth">设置家里排行</el-dropdown-item>
                <el-dropdown-item command="age">设置年龄段</el-dropdown-item>
                <el-dropdown-item command="reset">重置密码</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </div>
    </div>

    <!-- P2：家庭协作默认折叠；有待用邀请码时展开 -->
    <div class="card-panel family-panel">
      <button type="button" class="family-fold-toggle" @click="familyOpen = !familyOpen">
        <span>
          <strong>家庭协作</strong>
          <span class="muted tiny">邀请另一位家长</span>
        </span>
        <span class="muted">{{ familyOpen ? '收起' : '展开' }}</span>
      </button>
      <div v-if="familyOpen" class="family-fold-body">
        <p class="muted" style="margin-top: 0">
          点「生成邀请码」复制发给对方；对方需用<strong>自己的账号</strong>登录后点「输入邀请码」。
        </p>
        <div v-if="coParents.length" class="co-list">
          <div v-for="p in coParents" :key="p.id" class="co-row">
            <strong>{{ p.name }}</strong>
            <span class="muted">{{ p.username }}</span>
          </div>
        </div>
        <div v-if="pendingInvite" class="invite-box">
          <div class="muted">待使用邀请码</div>
          <div class="invite-code">{{ pendingInvite.code }}</div>
          <el-button class="tap-btn" @click="copyInvite">复制邀请码</el-button>
        </div>
        <div class="family-actions">
          <el-button type="primary" class="tap-btn" :loading="inviteBusy" @click="createInvite">
            生成邀请码
          </el-button>
          <el-button class="tap-btn" @click="acceptDlg = true">输入邀请码</el-button>
        </div>
      </div>
    </div>

    <el-drawer
      v-model="dlg"
      title="添加学生"
      :direction="isPhone ? 'btt' : 'rtl'"
      :size="isPhone ? 'var(--drawer-phone)' : isTv ? '480px' : '400px'"
      destroy-on-close
    >
      <el-form label-position="top" :model="form" @submit.prevent="create">
        <el-form-item label="姓名">
          <el-input v-model="form.name" size="large" placeholder="例如：小明" />
        </el-form-item>
        <el-form-item label="家里排行（可选）">
          <el-input-number v-model="form.birthOrder" :min="1" :max="20" size="large" />
          <p class="muted tiny-hint">1 = 大孩。用于轮值顺序与公平提示；可不填，将按添加顺序排。</p>
        </el-form-item>
        <el-form-item label="年龄段（可选）">
          <el-select v-model="form.ageBand" clearable placeholder="用家庭默认" size="large" style="width: 100%">
            <el-option label="低龄（更少清单、更大按钮）" value="young" />
            <el-option label="通用" value="general" />
            <el-option label="少年（更安静庆祝）" value="teen" />
          </el-select>
          <p class="muted tiny-hint">混龄家庭可为每个孩子单独设；不选则用「教育设置」里的家庭默认。</p>
        </el-form-item>
        <el-form-item label="账号">
          <el-input v-model="form.username" size="large" placeholder="登录用账号" />
        </el-form-item>
        <el-form-item label="初始密码">
          <el-input
            v-model="form.password"
            type="password"
            size="large"
            show-password
            placeholder="至少 6 位"
          />
          <p class="muted tiny-hint">请自设初始密码，勿用过于简单的默认口令；孩子可用登录码进入。</p>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button
          type="primary"
          class="tap-btn full-tap"
          :loading="saving"
          @click="create"
        >
          添加并生成登录码
        </el-button>
      </template>
    </el-drawer>
    <el-drawer
      v-model="acceptDlg"
      title="加入家庭"
      :direction="isPhone ? 'btt' : 'rtl'"
      :size="isPhone ? 'var(--drawer-phone)' : '380px'"
      destroy-on-close
    >
      <el-form label-position="top" @submit.prevent="acceptInvite">
        <p class="muted" style="margin-top: 0">
          请使用<strong>另一位家长</strong>的账号登录后再输入。不能输入自己生成的码。
        </p>
        <el-form-item label="邀请码">
          <el-input
            v-model="acceptCode"
            size="large"
            placeholder="6 位邀请码"
            maxlength="8"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button
          type="primary"
          class="tap-btn full-tap"
          :loading="inviteBusy"
          @click="acceptInvite"
        >
          加入并共享孩子
        </el-button>
      </template>
    </el-drawer>

    <SoftPrompt
      v-model="soft.open"
      :title="soft.title"
      :message="soft.message"
      :placeholder="soft.placeholder"
      :confirm-text="soft.confirmText"
      cancel-text="取消"
      :show-input="soft.showInput"
      :require-note="soft.requireNote"
      :initial-note="soft.initial"
      :templates="soft.templates"
      :hint="soft.hint"
      @confirm="onSoftConfirm"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import http from '../../api/http'
import { useBreakpoint } from '../../composables/useBreakpoint'
import { useAuthStore } from '../../stores/auth'
import LoginCodeQr from '../../components/LoginCodeQr.vue'
import SoftPrompt from '../../components/SoftPrompt.vue'
import {
  buildRefreshCodeSoftCopy,
  buildResetPasswordSoftCopy,
} from '../../composables/studentSoftCopy'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const { isPhone, isTv, isTablet, isDesktop } = useBreakpoint()
/** 平板/桌面：左选娃 · 右亮码 */
const useStudentSplit = computed(() => isTablet.value || isDesktop.value)
const selectedStudentId = ref(0)
const selectedStudent = computed(
  () => list.value.find((s) => s.id === selectedStudentId.value) || null,
)

type SoftMode = '' | 'birth' | 'age' | 'refresh' | 'password'
const soft = reactive({
  open: false,
  mode: '' as SoftMode,
  studentId: 0,
  title: '',
  message: '',
  placeholder: '',
  confirmText: '确定',
  showInput: true,
  requireNote: false,
  initial: '',
  templates: [] as string[],
  hint: '',
})

const AGE_LABEL_TO_CODE: Record<string, string | null> = {
  低龄: 'young',
  通用: 'general',
  少年: 'teen',
  家庭默认: null,
}
const AGE_CODE_TO_LABEL: Record<string, string> = {
  young: '低龄',
  general: '通用',
  teen: '少年',
}
const REVEALED_KEY = 'xueji.revealedLoginCodes'
/** 明文登录码仅短时留在本页 session（SEC P2b） */
const REVEAL_TTL_MS = 10 * 60 * 1000

type RevealedEntry = { code: string; at: number }

function readRevealedCodes(): Record<number, RevealedEntry> {
  try {
    const raw = sessionStorage.getItem(REVEALED_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, unknown>
    const out: Record<number, RevealedEntry> = {}
    const now = Date.now()
    for (const [k, v] of Object.entries(parsed || {})) {
      const id = Number(k)
      if (!Number.isFinite(id)) continue
      // 兼容旧格式：纯字符串码
      if (typeof v === 'string' && /^\d{6,8}$/.test(v)) {
        out[id] = { code: v, at: now }
        continue
      }
      const ent = v as RevealedEntry
      if (
        ent &&
        /^\d{6,8}$/.test(String(ent.code || '')) &&
        typeof ent.at === 'number' &&
        now - ent.at < REVEAL_TTL_MS
      ) {
        out[id] = { code: String(ent.code), at: ent.at }
      }
    }
    return out
  } catch {
    return {}
  }
}

const revealedCodes = reactive<Record<number, RevealedEntry>>(readRevealedCodes())
const list = ref<any[]>([])
const enteringId = ref(0)
const loading = ref(true)
const saving = ref(false)
const dlg = ref(false)
const acceptDlg = ref(false)
const inviteBusy = ref(false)
const acceptCode = ref('')
const coParents = ref<any[]>([])
const pendingInvite = ref<{ code: string; expiresAt: string } | null>(null)
const familyOpen = ref(false)
const form = reactive({
  name: '',
  username: '',
  password: '',
  birthOrder: undefined as number | undefined,
  ageBand: '' as string,
})

function persistRevealed() {
  sessionStorage.setItem(REVEALED_KEY, JSON.stringify(revealedCodes))
}

function rememberCode(id: number, code: string | null | undefined) {
  if (!id || !code || !/^\d{6,8}$/.test(code)) return
  revealedCodes[id] = { code, at: Date.now() }
  persistRevealed()
}

function displayCode(row: any): string | null {
  if (!row) return null
  const ent = revealedCodes[row.id]
  if (ent) {
    if (Date.now() - ent.at >= REVEAL_TTL_MS) {
      delete revealedCodes[row.id]
      persistRevealed()
    } else {
      return ent.code
    }
  }
  return row.loginCode || null
}

function codeLabel(row: any): string {
  const full = displayCode(row)
  if (full) return full
  if (row?.loginCodeHint) return `••••${row.loginCodeHint}`
  if (row?.hasLoginCode) return '已设置'
  return '无码'
}

function canEnterAs(row: any): boolean {
  if (!row?.hasLoginCode && !displayCode(row)) return false
  if (!row.loginCodeExpiresAt) return false
  return new Date(row.loginCodeExpiresAt).getTime() >= Date.now()
}

function ageBandLabel(b: string) {
  return (
    ({ young: '低龄', general: '通用', teen: '少年' } as Record<string, string>)[
      b
    ] || b
  )
}

function expiryText(iso: string) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const days = Math.ceil((d.getTime() - Date.now()) / (24 * 3600 * 1000))
  const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`
  if (days < 0) return `已于 ${dateStr} 过期，请刷新`
  if (days <= 7) return `将于 ${dateStr} 过期（还剩 ${days} 天）`
  return `有效期至 ${dateStr}`
}

async function loadFamily() {
  try {
    const data: any = await http.get('/family/co-parents')
    coParents.value = data.coParents || []
    pendingInvite.value = data.pendingInvite || null
    if (pendingInvite.value) familyOpen.value = true
  } catch {
    // ignore
  }
}

watch(pendingInvite, (v) => {
  if (v) familyOpen.value = true
})

async function load() {
  loading.value = true
  try {
    list.value = (await http.get('/students')) as any[]
    if (
      list.value.length &&
      !list.value.some((s) => s.id === selectedStudentId.value)
    ) {
      selectedStudentId.value = list.value[0].id
    }
    await loadFamily()
  } catch (e: any) {
    ElMessage.error(e.message || '加载失败')
  } finally {
    loading.value = false
  }
}

async function createInvite() {
  inviteBusy.value = true
  try {
    const data: any = await http.post('/family/invites')
    pendingInvite.value = { code: data.code, expiresAt: data.expiresAt }
    ElMessage.success(`邀请码：${data.code}`)
  } catch (e: any) {
    ElMessage.error(e.message || '生成失败')
  } finally {
    inviteBusy.value = false
  }
}

async function copyInvite() {
  if (!pendingInvite.value?.code) return
  try {
    await navigator.clipboard.writeText(pendingInvite.value.code)
    ElMessage.success('已复制邀请码')
  } catch {
    ElMessage.info(`邀请码：${pendingInvite.value.code}`)
  }
}

async function acceptInvite() {
  const code = acceptCode.value.trim().toUpperCase().replace(/\s+/g, '')
  if (!code) return ElMessage.warning('请输入邀请码')
  if (pendingInvite.value?.code === code) {
    ElMessage.warning('这是你自己生成的码，请发给另一位家长，用对方账号登录后输入')
    return
  }
  inviteBusy.value = true
  try {
    const data: any = await http.post('/family/invites/accept', { code })
    if (data?.ok === false) {
      ElMessage.warning(data.message || '无法加入')
      return
    }
    ElMessage.success(data.message || '已加入家庭')
    acceptDlg.value = false
    acceptCode.value = ''
    await load()
  } catch (e: any) {
    ElMessage.error(e.message || '加入失败')
  } finally {
    inviteBusy.value = false
  }
}

function openCreate() {
  form.name = ''
  form.username = ''
  form.password = ''
  form.birthOrder = (list.value.length || 0) + 1
  form.ageBand = ''
  dlg.value = true
}

async function create() {
  if (!form.name || !form.username || !form.password) {
    ElMessage.warning('请填写完整')
    return
  }
  if (form.password.length < 6) {
    ElMessage.warning('初始密码至少 6 位')
    return
  }
  saving.value = true
  try {
    const created: any = await http.post('/students', {
      name: form.name,
      username: form.username,
      password: form.password,
      birthOrder: form.birthOrder || undefined,
      ageBand: form.ageBand || undefined,
    })
    rememberCode(created?.id, created?.loginCode)
    ElMessage.success(
      created?.loginCode
        ? `已添加，登录码：${created.loginCode}`
        : '已添加，请把登录码告诉孩子',
    )
    dlg.value = false
    await load()
  } catch (e: any) {
    ElMessage.error(e.message)
  } finally {
    saving.value = false
  }
}

async function copyCode(row: any) {
  const code = displayCode(row)
  if (!code) return ElMessage.warning('暂无完整登录码，请先刷新')
  try {
    await navigator.clipboard.writeText(code)
    ElMessage.success(`已复制 ${row.name} 的登录码`)
  } catch {
    ElMessage.info(`登录码：${code}`)
  }
}

async function enterAs(row: any) {
  if (enteringId.value) return
  enteringId.value = row.id
  try {
    await auth.enterAsStudent(row.id)
    ElMessage.success(`已进入 ${row.name} 的今日`)
    router.push('/student/today')
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message || e?.message || '进入失败')
  } finally {
    enteringId.value = 0
  }
}

async function onMore(cmd: string, row: any) {
  if (cmd === 'enter') await enterAs(row)
  if (cmd === 'refresh') await refreshCode(row)
  if (cmd === 'reset') await resetPwd(row)
  if (cmd === 'birth') await setBirthOrder(row)
  if (cmd === 'age') await setAgeBand(row)
}

async function setBirthOrder(row: any) {
  soft.mode = 'birth'
  soft.studentId = row.id
  soft.title = `设置「${row.name}」的家里排行`
  soft.message =
    '1 = 大孩，数字越小越年长。标好排行后，共享家务的按天轮值会更公平。'
  soft.placeholder = '输入数字，1 = 大孩'
  soft.confirmText = '保存排行'
  soft.showInput = true
  soft.requireNote = true
  soft.initial = String(row.birthOrder || 1)
  soft.templates = ['1', '2', '3']
  soft.hint = '1 = 大孩，数字越小越年长；用于轮值与公平提示'
  soft.open = true
}

async function setAgeBand(row: any) {
  soft.mode = 'age'
  soft.studentId = row.id
  soft.title = `设置「${row.name}」的年龄段`
  soft.message =
    '年龄段会影响今日条数与庆祝调性。选「家庭默认」则跟随教育设置。'
  soft.placeholder = '也可点上方芯片'
  soft.confirmText = '保存'
  soft.showInput = true
  soft.requireNote = true
  soft.initial = row.ageBand
    ? AGE_CODE_TO_LABEL[row.ageBand] || row.ageBand
    : '家庭默认'
  soft.templates = ['低龄', '通用', '少年', '家庭默认']
  soft.hint = '点芯片即可，不必手填英文'
  soft.open = true
}

async function refreshCode(row: any) {
  soft.mode = 'refresh'
  soft.studentId = row.id
  const copy = buildRefreshCodeSoftCopy(row.name)
  soft.title = copy.title
  soft.message = copy.message
  soft.placeholder = copy.placeholder
  soft.confirmText = copy.confirmText
  soft.showInput = copy.showInput
  soft.requireNote = copy.requireNote
  soft.initial = ''
  soft.templates = []
  soft.hint = copy.hint
  soft.open = true
}

async function resetPwd(row: any) {
  soft.mode = 'password'
  soft.studentId = row.id
  const copy = buildResetPasswordSoftCopy(row.name)
  soft.title = copy.title
  soft.message = copy.message
  soft.placeholder = copy.placeholder
  soft.confirmText = copy.confirmText
  soft.showInput = copy.showInput
  soft.requireNote = copy.requireNote
  soft.initial = ''
  soft.templates = []
  soft.hint = copy.hint
  soft.open = true
}

async function onSoftConfirm(note: string) {
  const id = soft.studentId
  const mode = soft.mode
  soft.open = false
  if (!id || !mode) return

  try {
    if (mode === 'birth') {
      const birthOrder = Number(String(note || '').trim())
      if (!Number.isInteger(birthOrder) || birthOrder < 1) {
        ElMessage.warning('请输入正整数排行')
        return
      }
      await http.patch(`/students/${id}`, { birthOrder })
      ElMessage.success('已更新排行')
      await load()
      return
    }
    if (mode === 'age') {
      const label = String(note || '').trim()
      let code: string | null | undefined
      if (label in AGE_LABEL_TO_CODE) {
        code = AGE_LABEL_TO_CODE[label]
      } else {
        const raw = label.toLowerCase()
        if (!raw) code = null
        else if (['young', 'general', 'teen'].includes(raw)) code = raw
        else {
          ElMessage.warning('请点芯片选择：低龄 / 通用 / 少年 / 家庭默认')
          return
        }
      }
      await http.patch(`/students/${id}`, { ageBand: code })
      ElMessage.success(code ? '已更新年龄段' : '已改回家庭默认')
      await load()
      return
    }
    if (mode === 'refresh') {
      const updated: any = await http.post(`/students/${id}/login-code`)
      rememberCode(id, updated?.loginCode)
      ElMessage.success(
        updated?.loginCode ? `新登录码：${updated.loginCode}` : '已刷新登录码',
      )
      await load()
      return
    }
    if (mode === 'password') {
      const password = String(note || '').trim()
      if (password.length < 6) {
        ElMessage.warning('密码至少 6 位')
        return
      }
      await http.patch(`/students/${id}`, { password })
      ElMessage.success('已重置密码')
    }
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message || e?.message || '操作失败')
  }
}

/** 看板洞察深链：优先给未设排行的孩子打开 SoftPrompt */
async function applyBirthFocusFromRoute() {
  if (String(route.query.focus || '') !== 'birth') return
  const missing = list.value.find(
    (s) => s.birthOrder == null || Number(s.birthOrder) <= 0,
  )
  const target = missing || list.value[0]
  if (!target) {
    router.replace({ path: '/parent/students', query: {} })
    return
  }
  selectedStudentId.value = target.id
  await nextTick()
  setBirthOrder(target)
  router.replace({ path: '/parent/students', query: {} })
}

onMounted(async () => {
  await load()
  await applyBirthFocusFromRoute()
})

watch(
  () => route.query.focus,
  () => {
    void applyBirthFocusFromRoute()
  },
)
</script>

<style scoped>
.lead {
  margin: -4px 0 14px;
  line-height: 1.5;
}
.family-panel {
  margin-top: 16px;
}
.family-fold-toggle {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  border: 0;
  background: transparent;
  padding: 4px 0;
  cursor: pointer;
  text-align: left;
  min-height: var(--tap-min);
}
.family-fold-toggle .tiny {
  display: block;
  margin-top: 2px;
  font-size: 0.82rem;
  font-weight: 400;
}
.family-fold-body {
  margin-top: 10px;
  padding-top: 4px;
}
.family-panel h3,
.family-fold-toggle strong {
  font-family: var(--font-display);
}
.co-list {
  margin-bottom: 12px;
}
.co-row {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 0;
  border-bottom: 1px dashed var(--line);
}
.invite-box {
  text-align: center;
  padding: 12px;
  margin-bottom: 12px;
  border-radius: 12px;
  background: var(--accent-soft);
}
.invite-code {
  font-size: 1.6rem;
  font-weight: 800;
  letter-spacing: 0.16em;
  color: var(--accent-strong);
  margin: 6px 0 10px;
}
.family-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.empty-hero {
  text-align: center;
  padding: 36px 20px;
}
.empty-hero h3 {
  margin: 0 0 8px;
  font-family: var(--font-display);
}
.student-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
}
.students-shell.is-split {
  display: grid;
  grid-template-columns: minmax(200px, 0.9fr) minmax(280px, 1.1fr);
  gap: 16px;
  align-items: start;
  margin-bottom: 12px;
}
.students-side {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.student-pick {
  text-align: left;
  border: 1px solid var(--line);
  background: var(--warm, #faf7f2);
  border-radius: 12px;
  padding: 12px 14px;
  cursor: pointer;
  min-height: var(--tap-min);
}
.student-pick strong {
  display: block;
  font-family: var(--font-display);
  margin-bottom: 2px;
}
.student-pick.active {
  border-color: var(--accent, #3d8b6e);
  background: color-mix(in srgb, var(--accent, #3d8b6e) 10%, #fff);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent, #3d8b6e) 16%, transparent);
}
.student-detail {
  position: sticky;
  top: 16px;
  margin: 0;
}
.student-card {
  margin-bottom: 0;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.card-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 10px;
}
.card-top h3 {
  margin: 0 0 4px;
  font-family: var(--font-display);
  font-size: 1.25rem;
}
.meta {
  margin: 0;
  font-size: 0.9rem;
}
.code-hero {
  text-align: center;
  padding: 16px 14px;
  border-radius: 14px;
  background: linear-gradient(160deg, #fff 0%, var(--accent-soft) 100%);
  border: 1px solid rgba(47, 111, 78, 0.12);
}
.code-label {
  display: block;
  font-size: 0.85rem;
  margin-bottom: 6px;
}
.code {
  font-size: clamp(1.8rem, 5vw, 2.4rem);
  font-weight: 800;
  letter-spacing: 0.18em;
  color: var(--accent-strong);
  margin-bottom: 8px;
  font-variant-numeric: tabular-nums;
}
.expiry {
  font-size: 0.85rem;
  margin-bottom: 12px;
}
.more-row {
  display: flex;
  justify-content: flex-end;
}
@media (min-width: 768px) {
  .student-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (min-width: 1600px) {
  .code {
    font-size: 2.8rem;
  }
}
</style>
