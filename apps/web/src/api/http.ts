import axios from 'axios'
import type { AxiosRequestConfig } from 'axios'
import { useAuthStore } from '../stores/auth'
import router from '../router'

declare module 'axios' {
  export interface AxiosRequestConfig {
    /** 返回 { data, etag, notModified }，供 Monitor ETag 使用 */
    returnMeta?: boolean
  }
}

const http = axios.create({
  baseURL: '/api',
  timeout: 15000,
})

http.interceptors.request.use((config) => {
  const auth = useAuthStore()
  if (auth.token) {
    config.headers.Authorization = `Bearer ${auth.token}`
  }
  return config
})

http.interceptors.response.use(
  (res) => {
    if (res.status === 304) {
      if (res.config.returnMeta) {
        return {
          notModified: true,
          etag: String(res.headers.etag || ''),
          data: null,
        }
      }
      return null
    }
    const body = res.data
    if (body && typeof body === 'object' && 'code' in body) {
      if (body.code !== 0) {
        return Promise.reject(new Error(body.message || '请求失败'))
      }
      if (res.config.returnMeta) {
        return {
          notModified: false,
          etag: String(res.headers.etag || ''),
          data: body.data,
        }
      }
      return body.data
    }
    return body
  },
  (err) => {
    if (err.response?.status === 401) {
      const auth = useAuthStore()
      auth.logout()
      router.push('/login')
    }
    const msg =
      err.response?.data?.message || err.message || '网络错误'
    return Promise.reject(new Error(msg))
  },
)

export type HttpMeta<T = any> = {
  notModified: boolean
  etag: string
  data: T
}

export async function getWithMeta<T = any>(
  url: string,
  config?: AxiosRequestConfig,
): Promise<HttpMeta<T>> {
  return http.get(url, { ...config, returnMeta: true }) as Promise<HttpMeta<T>>
}

export default http
