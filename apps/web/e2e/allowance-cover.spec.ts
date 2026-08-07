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

test.describe('学迹零花封面抽样', () => {
  test('学生新目标：封面可选（开账本时）或未开启空态', async ({ page }) => {
    await clearSession(page)
    await page.getByRole('button', { name: '学生进入' }).click()
    await page.keyboard.type(STUDENT_CODE)
    await expect(page).toHaveURL(/\/student(\/today)?/, { timeout: 20_000 })
    const skip = page.getByRole('button', { name: '稍后再说' })
    if (await skip.isVisible().catch(() => false)) await skip.click()

    await page.goto('/student/allowance')
    await expect(page.getByRole('heading', { name: '我的零花钱' })).toBeVisible({
      timeout: 15_000,
    })

    const disabled = page.getByText('家庭还没打开零花钱账本')
    if (await disabled.isVisible().catch(() => false)) {
      await expect(page.getByRole('button', { name: '去愿望商店' })).toBeVisible()
      return
    }

    await page.getByRole('button', { name: '新目标' }).click()
    await expect(page.getByRole('heading', { name: '新储蓄目标' }).or(
      page.getByText('新储蓄目标'),
    )).toBeVisible()
    await expect(page.getByText('封面（可选）')).toBeVisible()
    await expect(page.locator('button.tap-btn').filter({ hasText: '选照片' })).toBeVisible()
    await expect(page.getByText(/可不选/)).toBeVisible()
    // 未选封面也可点创建（校验前端不强制封面）
    await expect(page.getByRole('button', { name: '创建目标' })).toBeEnabled()
  })

  test('家长零花：折叠「入账与目标」可见储蓄目标区', async ({ page }) => {
    await clearSession(page)
    await page.getByRole('button', { name: '家长' }).click()
    await page.getByRole('textbox', { name: '账号' }).fill(PARENT_USER)
    await page.getByRole('textbox', { name: '密码' }).fill(PARENT_PASS)
    await page.locator('form').getByRole('button', { name: '登录' }).click()
    await expect(page).toHaveURL(/\/parent(\/monitor)?/)

    await page.goto('/parent/allowance')
    const disabled = page.getByText(/还没打开|未开启零花/)
    if (await disabled.isVisible().catch(() => false)) {
      test.info().annotations.push({
        type: 'note',
        description: 'demo 未开零花，跳过折叠断言',
      })
      return
    }

    await expect(page.getByText('入账与目标')).toBeVisible({ timeout: 15_000 })
    await page.getByText('入账与目标').click()
    await expect(page.getByRole('heading', { name: '储蓄目标（只读）' })).toBeVisible()
  })
})
