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

test.describe('学迹看板批量通过文案', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('窄屏待处理：可勾选并打开批量通过 SoftPrompt', async ({ page }) => {
    await clearSession(page)
    await page.getByRole('button', { name: '家长' }).click()
    await page.getByRole('textbox', { name: '账号' }).fill(PARENT_USER)
    await page.getByRole('textbox', { name: '密码' }).fill(PARENT_PASS)
    await page.locator('form').getByRole('button', { name: '登录' }).click()
    await expect(page).toHaveURL(/\/parent(\/monitor)?/)

    const pending = page.getByRole('region', { name: '待处理' })
    await expect(pending).toBeVisible({ timeout: 15_000 })

    const checks = pending.locator('.row-check')
    const n = await checks.count()
    if (n === 0) {
      await expect(
        pending.getByText(/暂无待处理|待确认打卡|孩子想加的小事/),
      ).toBeVisible()
      return
    }

    // 优先勾选非「补上进度」行（补上不可批量）
    const normalRow = pending.locator('.pending-item').filter({
      hasNot: page.getByText('补上进度'),
    })
    const normalCount = await normalRow.count()
    if (normalCount === 0) {
      await checks.first().click()
      await pending.getByRole('button', { name: '批量通过并点赞' }).click()
      await expect(page.getByText(/补上进度请单条确认/)).toBeVisible({
        timeout: 5_000,
      })
      return
    }

    await normalRow.first().locator('.row-check').click()
    await expect(pending.getByText(/已选 \d+ 项/)).toBeVisible()
    await pending.getByRole('button', { name: '批量通过并点赞' }).click()

    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await expect(page.getByRole('heading', { name: '批量通过' })).toBeVisible()
    await expect(dialog.getByText(/批量通过并点赞 \d+ 条/)).toBeVisible()
    await expect(dialog.getByText(/默认鼓励/)).toBeVisible()
    await expect(page.getByRole('button', { name: '通过并点赞' })).toBeVisible()
    await page.getByRole('button', { name: '取消' }).click()
    await expect(dialog).toHaveCount(0)
  })
})
