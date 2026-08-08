import { test, expect } from '@playwright/test'

const API_BASE = process.env.E2E_API_BASE || 'http://127.0.0.1:3000'

test.describe('学迹安全冒烟', () => {
  test('注册密码不足 6 位时前端拦截', async ({ page }) => {
    await page.goto('/login')
    await page.evaluate(() => {
      localStorage.clear()
      sessionStorage.clear()
    })
    await page.goto('/login')
    await page.getByRole('button', { name: '家长' }).click()
    await page.getByRole('button', { name: '注册' }).click()
    await page.getByRole('textbox', { name: '称呼' }).fill('测试家长')
    await page.getByRole('textbox', { name: '账号' }).fill(`e2e_weak_${Date.now()}`)
    await page.getByRole('textbox', { name: '密码' }).fill('12345')
    await page.locator('form').getByRole('button', { name: '注册并登�? }).click()
    await expect(page.getByText('密码至少 6 �?)).toBeVisible({ timeout: 5000 })
    await expect(page).toHaveURL(/\/login/)
  })

  test('无签名访�?/uploads 返回 401', async ({ request }) => {
    const res = await request.get(`${API_BASE}/uploads/e2e-missing-file.jpg`)
    expect(res.status()).toBe(401)
    const body = await res.json()
    expect(body.code).toBe(401)
  })
})
