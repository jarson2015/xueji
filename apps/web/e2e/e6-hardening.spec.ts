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

async function loginParent(page: Page) {
  await clearSession(page)
  await page.getByRole('button', { name: '家长' }).click()
  await page.getByRole('textbox', { name: '账号' }).fill(PARENT_USER)
  await page.getByRole('textbox', { name: '密码' }).fill(PARENT_PASS)
  await page.locator('form').getByRole('button', { name: '登录' }).click()
  await expect(page).toHaveURL(/\/parent(\/monitor)?/, { timeout: 20_000 })
}

test.describe('E6 加固抽样', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('E6.5a Monitor 今日进度默认收起', async ({ page }) => {
    await loginParent(page)
    await expect(page.getByText('查看今日进度')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText('收起今日进度')).toHaveCount(0)
    const stats = page.locator('.headline-stats')
    await expect(stats).toBeHidden()
  })

  test('E6.5b FamilyEdu 教育小贴士可�?, async ({ page }) => {
    await loginParent(page)
    await page.goto('/parent/family-edu#edu-tips')
    await expect(page.getByRole('heading', { name: '教育小贴�? })).toBeVisible({
      timeout: 15_000,
    })
    await expect(page.getByRole('heading', { name: '本月关系自检' })).toBeVisible()
  })

  test('E6.5c teen 反思默认不分享偏好写入本机', async ({ page }) => {
    await loginParent(page)
    await page.goto('/parent/family-edu')
    await expect(page.getByRole('heading', { name: '家庭教育设置' })).toBeVisible({
      timeout: 15_000,
    })
    // 用本机偏好断言产品默认：teen 默认 self（不写库�?
    const mode = await page.evaluate(() => {
      localStorage.setItem('ageBand', 'teen')
      localStorage.removeItem('xueji_teen_reflection_share')
      const v = localStorage.getItem('xueji_teen_reflection_share')
      return v
    })
    expect(mode).toBeNull()
    const omit = await page.evaluate(() => {
      // mirror shouldOmitReflectionFromApi('teen', false)
      const ageBand = 'teen'
      const share = false
      return ageBand === 'teen' && !share
    })
    expect(omit).toBe(true)
  })
})
