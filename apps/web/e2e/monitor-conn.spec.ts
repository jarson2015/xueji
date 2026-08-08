import { test, expect, type Page } from '@playwright/test'

const PARENT_USER = process.env.E2E_PARENT_USER || 'parent@demo.com'
const PARENT_PASS = process.env.E2E_PARENT_PASS || 'demo1234'

async function clearSession(page: Page) {
  await page.goto('/login')
  await page.evaluate(() => {
    localStorage.clear()
    sessionStorage.clear()
    localStorage.setItem('onboardParentV2', 'done')
    localStorage.setItem('guideParentDone', '1')
  })
  await page.goto('/login')
}

async function loginAsParent(page: Page) {
  await clearSession(page)
  await page.getByRole('button', { name: '家长' }).click()
  await page.getByRole('textbox', { name: '账号' }).fill(PARENT_USER)
  await page.getByRole('textbox', { name: '密码' }).fill(PARENT_PASS)
  await page.locator('form').getByRole('button', { name: '登录' }).click()
  await expect(page).toHaveURL(/\/parent(\/monitor)?/)
}

test.describe('学迹看板连接态文�?, () => {
  test('正常连接不刷「实时已连接」；浏览器离线见「离线刷新中�?, async ({
    page,
    context,
  }) => {
    await loginAsParent(page)
    await page.goto('/parent/monitor')
    await expect(page.getByRole('heading', { name: '今日看板' })).toBeVisible({
      timeout: 15_000,
    })
    await expect(page.getByText('实时已连�?)).toHaveCount(0)

    await context.setOffline(true)
    await expect(page.getByText('离线刷新�?)).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText('实时已连�?)).toHaveCount(0)
  })
})
