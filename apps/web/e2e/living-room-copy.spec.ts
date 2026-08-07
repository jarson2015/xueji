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

test.describe('学迹家长 More 客厅导航白话', () => {
  test('白话开关可见；页面无 ?tv= 口吻', async ({ page }) => {
    await clearSession(page)
    await page.getByRole('button', { name: '家长' }).click()
    await page.getByRole('textbox', { name: '账号' }).fill(PARENT_USER)
    await page.getByRole('textbox', { name: '密码' }).fill(PARENT_PASS)
    await page.locator('form').getByRole('button', { name: '登录' }).click()
    await expect(page).toHaveURL(/\/parent(\/monitor)?/)

    await page.goto('/parent/more')
    await expect(page.getByRole('button', { name: '用客厅导航' })).toBeVisible({
      timeout: 15_000,
    })
    await expect(page.getByRole('button', { name: '恢复完整导航' })).toBeVisible()
    await expect(page.getByText(/大屏办公默认是完整侧栏/)).toBeVisible()

    const bodyText = await page.locator('.page').innerText()
    expect(bodyText).not.toMatch(/\?tv=/)
    expect(bodyText).not.toMatch(/tv=1/)

    await page.getByRole('button', { name: '用客厅导航' }).click()
    await expect
      .poll(async () =>
        page.evaluate(() => localStorage.getItem('xueji_tv_mode')),
      )
      .toBe('1')
    await page.getByRole('button', { name: '恢复完整导航' }).click()
    await expect
      .poll(async () =>
        page.evaluate(() => localStorage.getItem('xueji_tv_mode')),
      )
      .toBeNull()
  })
})
