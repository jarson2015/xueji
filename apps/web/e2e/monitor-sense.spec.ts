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

test.describe('学迹手机洞察收起', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('窄屏看板：有待办时洞察默认收起并可展开', async ({ page }) => {
    await clearSession(page)
    await page.getByRole('button', { name: '家长' }).click()
    await page.getByRole('textbox', { name: '账号' }).fill(PARENT_USER)
    await page.getByRole('textbox', { name: '密码' }).fill(PARENT_PASS)
    await page.locator('form').getByRole('button', { name: '登录' }).click()
    await expect(page).toHaveURL(/\/parent(\/monitor)?/)

    const toggle = page.locator('.zone-sense-toggle')
    await expect(toggle).toBeVisible({ timeout: 15_000 })
    await expect(toggle.getByText('动态与洞察')).toBeVisible()

    const pendingHint = page.locator('.sense-pending-hint')
    const body = page.locator('.zone-sense-body')

    if (await pendingHint.isVisible().catch(() => false)) {
      await expect(toggle.getByText('展开')).toBeVisible()
      await expect(body).toBeHidden()
      await toggle.click()
      await expect(toggle.getByText('收起')).toBeVisible()
      await expect(body).toBeVisible()
    } else {
      // 无待办时：至少可切换；不强制收起
      const label = toggle.locator('.muted').last()
      await expect(label).toBeVisible()
      await toggle.click()
      await expect(toggle.getByText(/展开|收起/)).toBeVisible()
    }
  })
})
