import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import http from '../api/http'
import { disconnectSharedSocket } from '../composables/socketShared'
import { parseParentProxyBackup } from '../composables/parentProxyBackup'

export type UserInfo = {
  id: number
  username: string
  name: string
  role: 'parent' | 'student'
  pointsBalance: number
}

function readStoredUser(): UserInfo | null {
  const raw = localStorage.getItem('user')
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw)
    if (
      parsed &&
      typeof parsed === 'object' &&
      typeof parsed.id === 'number' &&
      (parsed.role === 'parent' || parsed.role === 'student')
    ) {
      return parsed as UserInfo
    }
  } catch {
    /* corrupt */
  }
  localStorage.removeItem('user')
  localStorage.removeItem('token')
  return null
}

function readStoredToken(hasUser: boolean): string {
  const t = localStorage.getItem('token') || ''
  if (!t) return ''
  if (!hasUser) {
    localStorage.removeItem('token')
    return ''
  }
  return t
}

export const useAuthStore = defineStore('auth', () => {
  const initialUser = readStoredUser()
  const token = ref(readStoredToken(!!initialUser))
  const user = ref<UserInfo | null>(initialUser)

  const isParent = computed(() => user.value?.role === 'parent')
  const isStudent = computed(() => user.value?.role === 'student')

  function persist(data: { accessToken: string; user: UserInfo }) {
    token.value = data.accessToken
    user.value = data.user
    localStorage.setItem('token', token.value)
    localStorage.setItem('user', JSON.stringify(user.value))
    if (data.user.role === 'student') {
      localStorage.setItem('lastStudentName', data.user.name)
    }
  }

  async function login(username: string, password: string) {
    const data: any = await http.post('/auth/login', { username, password })
    persist(data)
    return data.user
  }

  async function register(payload: { username: string; password: string; name: string }) {
    const data: any = await http.post('/auth/register', payload)
    persist(data)
    return data.user
  }

  async function loginByCode(code: string) {
    const data: any = await http.post('/auth/login-code', { code })
    persist(data)
    return data.user
  }

  async function enterAsStudent(studentId: number) {
    const backup = { token: token.value, user: user.value }
    localStorage.setItem('parentProxyBackup', JSON.stringify(backup))
    const data: any = await http.post(`/students/${studentId}/enter-as`)
    persist(data)
    localStorage.setItem('studentProxy', '1')
    return data.user
  }

  function isParentProxy() {
    return localStorage.getItem('studentProxy') === '1'
  }

  function exitParentProxy() {
    const backup = parseParentProxyBackup(
      localStorage.getItem('parentProxyBackup'),
    )
    if (!backup) {
      logout()
      return false
    }
    token.value = backup.token
    user.value = backup.user as UserInfo
    localStorage.setItem('token', backup.token)
    localStorage.setItem('user', JSON.stringify(backup.user))
    localStorage.removeItem('parentProxyBackup')
    localStorage.removeItem('studentProxy')
    return true
  }

  async function fetchMe() {
    if (!token.value) return null
    const me: any = await http.get('/auth/me')
    user.value = me
    localStorage.setItem('user', JSON.stringify(me))
    return me
  }

  function logout() {
    disconnectSharedSocket()
    token.value = ''
    user.value = null
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    localStorage.removeItem('parentProxyBackup')
    localStorage.removeItem('studentProxy')
  }

  return {
    token,
    user,
    isParent,
    isStudent,
    login,
    register,
    loginByCode,
    enterAsStudent,
    isParentProxy,
    exitParentProxy,
    fetchMe,
    logout,
  }
})
