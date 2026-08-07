<template>
  <div class="login-wrap" :class="{ 'is-tv': isTv, 'is-compact': !isTv }">
    <div class="login-hero">
      <h1>学迹</h1>
      <p class="tagline">{{
        isTv ? '输入登录码，开始今天的一件小事' : '一家人本周的小事，慢慢做好'
      }}</p>
    </div>

    <div class="login-card">
      <!-- TV：默认学生进入，家长/注册下沉 -->
      <template v-if="isTv">
        <div class="student-enter">
          <p v-if="lastStudentName" class="hello">你好，{{ lastStudentName }}</p>
          <p class="muted tip">请输入家长给你的 6 位登录码（也可键盘或粘贴）</p>
          <div
            class="code-display"
            role="group"
            aria-label="6 位登录码"
            :aria-valuetext="codeDigits.length ? codeDigits.join('') : '尚未输入'"
            aria-live="polite"
          >
            <span v-for="i in 6" :key="i" class="code-cell">{{ codeDigits[i - 1] || '' }}</span>
          </div>
          <div class="numpad numpad-tv">
            <button
              v-for="n in numKeys"
              :key="n"
              type="button"
              class="num-key tap-btn"
              :aria-label="numKeyLabel(n)"
              @click="onNum(n)"
            >
              {{ n === 'del' ? '⌫' : n }}
            </button>
          </div>
          <el-button
            type="primary"
            class="tap-btn full-tap"
            :loading="loading"
            :disabled="codeDigits.length < 6"
            @click="onStudentSubmit"
          >
            进入今日
          </el-button>
        </div>
        <el-collapse class="alt-collapse">
          <el-collapse-item title="家长登录 / 注册" name="alt">
            <div class="alt-tabs">
              <button
                type="button"
                class="mode-tab"
                :class="{ active: mode === 'parent' }"
                @click="mode = 'parent'"
              >
                家长登录
              </button>
              <button
                type="button"
                class="mode-tab"
                :class="{ active: mode === 'register' }"
                @click="mode = 'register'"
              >
                注册
              </button>
            </div>
            <el-form
              v-if="mode !== 'register'"
              :model="form"
              @submit.prevent="onParentSubmit"
              label-position="top"
              size="large"
            >
              <el-form-item label="账号">
                <el-input
                  v-model="form.username"
                  :placeholder="showDemo ? 'parent@demo.com' : '请输入账号'"
                  class="login-input"
                  autocomplete="username"
                />
              </el-form-item>
              <el-form-item label="密码">
                <el-input
                  v-model="form.password"
                  type="password"
                  show-password
                  :placeholder="showDemo ? 'demo1234' : '请输入密码'"
                  class="login-input"
                  autocomplete="current-password"
                />
              </el-form-item>
              <el-button type="primary" class="tap-btn full-tap" :loading="loading" native-type="submit">
                登录
              </el-button>
            </el-form>
            <el-form
              v-else
              :model="regForm"
              @submit.prevent="onRegister"
              label-position="top"
              size="large"
            >
              <el-form-item label="称呼">
                <el-input v-model="regForm.name" placeholder="例如：妈妈" class="login-input" />
              </el-form-item>
              <el-form-item label="账号">
                <el-input v-model="regForm.username" placeholder="登录用账号" class="login-input" />
              </el-form-item>
              <el-form-item label="密码">
                <el-input
                  v-model="regForm.password"
                  type="password"
                  show-password
                  class="login-input"
                  autocomplete="new-password"
                />
              </el-form-item>
              <el-button type="primary" class="tap-btn full-tap" :loading="loading" native-type="submit">
                注册并登录
              </el-button>
            </el-form>
          </el-collapse-item>
        </el-collapse>
        <div v-if="showDemo" class="tv-demo muted">
          演示：{{ demoParent || 'parent@demo.com' }}
          <template v-if="firstDemoCode"> · {{ firstDemoName }} {{ firstDemoCode }}</template>
        </div>
      </template>

      <!-- 手机/平板/桌面：双路径，品牌在卡外 -->
      <template v-else>
        <div class="mode-tabs twin">
          <button
            type="button"
            class="mode-tab"
            :class="{ active: mode === 'student' }"
            @click="mode = 'student'"
          >
            学生进入
          </button>
          <button
            type="button"
            class="mode-tab"
            :class="{ active: mode === 'parent' || mode === 'register' }"
            @click="mode = mode === 'register' ? 'register' : 'parent'"
          >
            家长
          </button>
        </div>

        <div v-if="mode === 'student'" class="student-enter">
          <p v-if="lastStudentName" class="hello">你好，{{ lastStudentName }}</p>
          <p class="muted tip">请输入家长给你的 6 位登录码（也可键盘或粘贴）</p>
          <div
            class="code-display"
            role="group"
            aria-label="6 位登录码"
            :aria-valuetext="codeDigits.length ? codeDigits.join('') : '尚未输入'"
            aria-live="polite"
          >
            <span v-for="i in 6" :key="i" class="code-cell">{{ codeDigits[i - 1] || '' }}</span>
          </div>
          <div class="numpad">
            <button
              v-for="n in numKeys"
              :key="n"
              type="button"
              class="num-key tap-btn"
              :aria-label="numKeyLabel(n)"
              @click="onNum(n)"
            >
              {{ n === 'del' ? '⌫' : n }}
            </button>
          </div>
          <el-button
            type="primary"
            class="tap-btn full-tap"
            :loading="loading"
            :disabled="codeDigits.length < 6"
            @click="onStudentSubmit"
          >
            进入今日
          </el-button>
        </div>

        <template v-else>
          <div class="alt-tabs">
            <button
              type="button"
              class="mode-tab mini"
              :class="{ active: mode === 'parent' }"
              @click="mode = 'parent'"
            >
              登录
            </button>
            <button
              type="button"
              class="mode-tab mini"
              :class="{ active: mode === 'register' }"
              @click="mode = 'register'"
            >
              注册
            </button>
          </div>
          <el-form
            v-if="mode === 'parent'"
            :model="form"
            @submit.prevent="onParentSubmit"
            label-position="top"
            size="large"
          >
            <el-form-item label="账号">
              <el-input
                v-model="form.username"
                :placeholder="showDemo ? 'parent@demo.com' : '请输入账号'"
                class="login-input"
                autocomplete="username"
              />
            </el-form-item>
            <el-form-item label="密码">
              <el-input
                v-model="form.password"
                type="password"
                show-password
                :placeholder="showDemo ? 'demo1234' : '请输入密码'"
                class="login-input"
                autocomplete="current-password"
              />
            </el-form-item>
            <el-button type="primary" class="tap-btn full-tap" :loading="loading" native-type="submit">
              登录
            </el-button>
          </el-form>
          <el-form
            v-else
            :model="regForm"
            @submit.prevent="onRegister"
            label-position="top"
            size="large"
          >
            <el-form-item label="称呼">
              <el-input v-model="regForm.name" placeholder="例如：妈妈" class="login-input" />
            </el-form-item>
            <el-form-item label="账号">
              <el-input v-model="regForm.username" placeholder="登录用账号" class="login-input" />
            </el-form-item>
            <el-form-item label="密码">
              <el-input
                v-model="regForm.password"
                type="password"
                show-password
                class="login-input"
                autocomplete="new-password"
              />
            </el-form-item>
            <el-button type="primary" class="tap-btn full-tap" :loading="loading" native-type="submit">
              注册并登录
            </el-button>
            <p class="muted tip tip-left">另一位家长可先注册，再在「学生管理」输入邀请码加入家庭。</p>
          </el-form>
        </template>

        <el-collapse v-if="showDemo" class="demo-collapse">
          <el-collapse-item title="演示账号" name="demo">
            <p class="hint muted">
              家长：{{ demoParent || 'parent@demo.com' }} / demo1234<br />
              <template v-if="demoStudents.length">
                学生登录码：
                <span v-for="(s, i) in demoStudents" :key="s.username">
                  {{ i ? ' · ' : '' }}{{ s.name }}
                  {{ s.loginCode || (s.expired ? '已过期' : '—') }}
                </span>
              </template>
              <template v-else>学生登录码加载中…</template>
            </p>
            <div class="quick">
              <el-button class="tap-btn" @click="fillParent">填入家长</el-button>
              <el-button
                v-for="s in demoStudents.filter((x) => x.loginCode)"
                :key="s.username"
                class="tap-btn"
                @click="fillStudentCode(s.loginCode!)"
              >
                {{ s.name }}码
              </el-button>
            </div>
          </el-collapse-item>
        </el-collapse>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '../stores/auth'
import { useBreakpoint } from '../composables/useBreakpoint'
import { friendlyError } from '../composables/useOnboarding'
import { numKeyLabel } from '../composables/loginNudgeCopy'
import http from '../api/http'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()
const { isTv } = useBreakpoint()
const loading = ref(false)
const mode = ref<'parent' | 'register' | 'student'>('student')
const codeDigits = ref<string[]>([])
const lastStudentName = ref(localStorage.getItem('lastStudentName') || '')
const showDemo = ref(false)
const demoParent = ref('parent@demo.com')
const demoStudents = ref<
  { name: string; username: string; loginCode: string | null; expired: boolean }[]
>([])
const form = reactive({
  username: '',
  password: '',
})
const regForm = reactive({
  name: '',
  username: '',
  password: '',
})

const numKeys = computed(() => ['1', '2', '3', '4', '5', '6', '7', '8', '9', '清空', '0', 'del'])
const firstDemoCode = computed(() => demoStudents.value.find((s) => s.loginCode)?.loginCode || '')
const firstDemoName = computed(() => demoStudents.value.find((s) => s.loginCode)?.name || '')

function studentCodeActive() {
  return isTv.value || mode.value === 'student'
}

async function loadDemoHints() {
  try {
    const data: any = await http.get('/auth/demo-hints')
    showDemo.value = data?.enabled === true
    if (!showDemo.value) {
      demoStudents.value = []
      return
    }
    if (data?.parent?.username) demoParent.value = data.parent.username
    demoStudents.value = data?.students || []
  } catch {
    showDemo.value = false
    demoStudents.value = []
  }
}

function onNum(n: string) {
  if (n === '清空') {
    codeDigits.value = []
    return
  }
  if (n === 'del') {
    codeDigits.value = codeDigits.value.slice(0, -1)
    return
  }
  if (codeDigits.value.length >= 6) return
  codeDigits.value = [...codeDigits.value, n]
  if (codeDigits.value.length === 6) void onStudentSubmit()
}

function fillParent() {
  mode.value = 'parent'
  form.username = demoParent.value || 'parent@demo.com'
  form.password = 'demo1234'
}

function fillStudentCode(code: string) {
  mode.value = 'student'
  codeDigits.value = code.replace(/\D/g, '').slice(0, 6).split('')
  if (codeDigits.value.length === 6) void onStudentSubmit()
}

function onCodeKeydown(e: KeyboardEvent) {
  if (!studentCodeActive() || loading.value) return
  const t = e.target as HTMLElement | null
  if (t?.closest?.('input, textarea, [contenteditable="true"]')) return

  if (e.key === 'Enter') {
    e.preventDefault()
    void onStudentSubmit()
    return
  }
  if (e.key === 'Backspace') {
    e.preventDefault()
    onNum('del')
    return
  }
  if (e.key === 'Escape') {
    e.preventDefault()
    onNum('清空')
    return
  }
  if (/^\d$/.test(e.key)) {
    e.preventDefault()
    onNum(e.key)
  }
}

function onCodePaste(e: ClipboardEvent) {
  if (!studentCodeActive() || loading.value) return
  const t = e.target as HTMLElement | null
  if (t?.closest?.('input, textarea, [contenteditable="true"]')) return
  const digits = (e.clipboardData?.getData('text') || '').replace(/\D/g, '').slice(0, 6)
  if (!digits) return
  e.preventDefault()
  codeDigits.value = digits.split('')
  if (codeDigits.value.length === 6) void onStudentSubmit()
}

async function onParentSubmit() {
  loading.value = true
  try {
    const user = await auth.login(form.username, form.password)
    ElMessage.success('登录成功')
    router.push(user.role === 'parent' ? '/parent' : '/student')
  } catch (e: any) {
    ElMessage.error(friendlyError(e, '登录失败'))
  } finally {
    loading.value = false
  }
}

async function onRegister() {
  if (!regForm.name || !regForm.username || !regForm.password) {
    ElMessage.warning('请填写完整')
    return
  }
  if (regForm.password.length < 6) {
    ElMessage.warning('密码至少 6 位')
    return
  }
  loading.value = true
  try {
    await auth.register({ ...regForm })
    ElMessage.success('注册成功')
    router.push('/parent')
  } catch (e: any) {
    ElMessage.error(friendlyError(e, '注册失败'))
  } finally {
    loading.value = false
  }
}

async function onStudentSubmit() {
  if (codeDigits.value.length < 6 || loading.value) return
  loading.value = true
  try {
    const user = await auth.loginByCode(codeDigits.value.join(''))
    lastStudentName.value = user.name
    ElMessage.success(`欢迎，${user.name}`)
    router.push('/student/today')
  } catch (e: any) {
    ElMessage.error(friendlyError(e, '登录码无效'))
    if (showDemo.value) await loadDemoHints()
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  window.addEventListener('keydown', onCodeKeydown)
  window.addEventListener('paste', onCodePaste)
  await loadDemoHints()
  if (isTv.value) mode.value = 'student'
  const q = String(route.query.code || '').trim()
  if (/^\d{6}$/.test(q)) {
    mode.value = 'student'
    codeDigits.value = q.split('')
    await onStudentSubmit()
  }
})

onUnmounted(() => {
  window.removeEventListener('keydown', onCodeKeydown)
  window.removeEventListener('paste', onCodePaste)
})
</script>

<style scoped>
.login-wrap {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 20px;
  padding: calc(24px + env(safe-area-inset-top, 0px)) 20px
    calc(24px + env(safe-area-inset-bottom, 0px));
  background:
    radial-gradient(ellipse 90% 55% at 50% -8%, rgba(61, 139, 110, 0.28), transparent 58%),
    radial-gradient(circle at 12% 88%, rgba(255, 246, 232, 0.7), transparent 42%),
    radial-gradient(circle at 92% 70%, rgba(216, 235, 224, 0.55), transparent 40%),
    linear-gradient(180deg, #f3f7f4 0%, #eef3f0 40%, #f7faf8 100%);
}
.login-hero {
  text-align: center;
  max-width: 520px;
}
.login-hero h1 {
  margin: 0;
  font-size: clamp(2.8rem, 9vw, 4.2rem);
  color: var(--accent-strong, #2f6f56);
  letter-spacing: 0.14em;
  font-family: var(--font-display);
  font-weight: 400;
  text-shadow: 0 1px 0 rgba(255, 255, 255, 0.5);
}
.tagline {
  margin: 12px 0 0;
  color: var(--muted);
  font-size: 1.08rem;
  line-height: 1.5;
  max-width: 18em;
  margin-left: auto;
  margin-right: auto;
}
.login-card {
  width: min(440px, 100%);
  background: #fff;
  border-radius: 20px;
  padding: 24px 22px;
  box-shadow: 0 16px 40px rgba(28, 43, 36, 0.1);
  border: 1px solid rgba(47, 111, 78, 0.08);
}
.mode-tabs {
  display: grid;
  gap: 8px;
  margin-bottom: 18px;
}
.mode-tabs.twin {
  grid-template-columns: 1fr 1fr;
}
.alt-tabs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-bottom: 14px;
}
.mode-tab {
  min-height: var(--tap-min);
  border-radius: 12px;
  border: 1px solid var(--line);
  background: #f7faf8;
  color: var(--muted);
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
}
.mode-tab.mini {
  font-size: 0.92rem;
}
.mode-tab.active {
  background: var(--accent);
  border-color: var(--accent);
  color: #fff;
}
.hello {
  margin: 0 0 6px;
  font-size: 1.2rem;
  font-weight: 700;
  text-align: center;
}
.tip {
  text-align: center;
  margin: 0 0 14px;
}
.tip-left {
  text-align: left;
  margin-top: 12px;
}
.code-display {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 8px;
  margin-bottom: 16px;
}
.code-cell {
  min-height: 48px;
  border-radius: 12px;
  border: 2px solid var(--line);
  display: grid;
  place-items: center;
  font-size: 1.4rem;
  font-weight: 800;
  background: #fafcfb;
}
.numpad {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-bottom: 16px;
}
.num-key {
  min-height: var(--tap-min);
  border-radius: 12px;
  border: 1px solid var(--line);
  background: #fff;
  font-size: 1.2rem;
  font-weight: 700;
  cursor: pointer;
}
.numpad-tv .num-key {
  min-height: 72px;
  font-size: 1.5rem;
}
.hint {
  margin: 0;
  font-size: 0.9rem;
  line-height: 1.6;
}
.quick {
  display: flex;
  gap: 8px;
  margin-top: 12px;
  flex-wrap: wrap;
}
.demo-collapse,
.alt-collapse {
  margin-top: 18px;
  border: none;
}
.login-input :deep(.el-input__wrapper) {
  min-height: var(--tap-min);
}
.is-tv .login-card {
  width: min(640px, 92vw);
  padding: 36px 32px;
}
.is-tv .login-hero h1 {
  font-size: clamp(3.4rem, 6vw, 5rem);
}
.tv-demo {
  margin-top: 20px;
  font-size: 1.05rem;
  text-align: center;
}
</style>
