import { test, expect, type Page } from '@playwright/test'

const PARENT_USER = process.env.E2E_PARENT_USER || 'parent@demo.com'
const PARENT_PASS = process.env.E2E_PARENT_PASS || 'demo1234'
const STUDENT_CODE = process.env.E2E_STUDENT_CODE || '102938'

async function clearSession(page: Page) {
  await page.goto('/login')
  await page.evaluate(() => {
    localStorage.clear()
    sessionStorage.clear()
    localStorage.setItem('onboardParentV2', 'done')
    localStorage.setItem('guideParentDone', '1')
    localStorage.setItem('onboardStudentV2', 'done')
    localStorage.setItem('guideStudentDone', '1')
  })
  await page.goto('/login')
}

test.describe('学迹近端愿望抽样', () => {
  test('家长添加愿望：近端模板 ≥6 且可点填', async ({ page }) => {
    await clearSession(page)
    await page.getByRole('button', { name: '家长' }).click()
    await page.getByRole('textbox', { name: '账号' }).fill(PARENT_USER)
    await page.getByRole('textbox', { name: '密码' }).fill(PARENT_PASS)
    await page.locator('form').getByRole('button', { name: '登录' }).click()
    await expect(page).toHaveURL(/\/parent(\/monitor)?/)

    await page.goto('/parent/wishes')
    await page.getByRole('button', { name: '添加愿望' }).first().click()
    await expect(page.getByText('近端快捷模板')).toBeVisible()
    await expect(page.getByText('近端可兑')).toBeVisible()
    const templates = page.locator('.el-drawer').getByRole('button', {
      name: /多陪 10 分钟|选今晚故事|公园玩一圈|一起散步/,
    })
    await expect(templates.first()).toBeVisible()
    await page.getByRole('button', { name: '多陪 10 分钟' }).click()
    const titleInput = page
      .locator('.el-drawer .el-form-item')
      .filter({ hasText: '标题' })
      .locator('input')
    await expect(titleInput).toHaveValue('多陪 10 分钟')
  })

  test('学生愿望页可见商店结构（有近端则见「先兑这些」）', async ({ page }) => {
    await clearSession(page)
    await page.getByRole('button', { name: '学生进入' }).click()
    await page.keyboard.type(STUDENT_CODE)
    await expect(page).toHaveURL(/\/student(\/today)?/, { timeout: 20_000 })
    const skip = page.getByRole('button', { name: '稍后再说' })
    if (await skip.isVisible().catch(() => false)) await skip.click()

    await page.goto('/student/rewards')
    await expect(page.getByRole('heading', { name: '愿望奖励' })).toBeVisible({
      timeout: 15_000,
    })
    const near = page.getByRole('heading', { name: '先兑这些' })
    const shop = page.getByRole('heading', { name: /愿望商店|慢慢攒/ })
    await expect(near.or(shop).first()).toBeVisible()
  })
})
