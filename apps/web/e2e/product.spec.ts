import { test, expect, type Page } from '@playwright/test'

const PARENT_USER = process.env.E2E_PARENT_USER || 'parent@demo.com'
const PARENT_PASS = process.env.E2E_PARENT_PASS || 'demo1234'
const STUDENT_CODE = process.env.E2E_STUDENT_CODE || '10293847'

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

test.describe('学迹产品主路�?, () => {
  test('学生今日可见「我想加一件小事」并可打开抽屉', async ({ page }) => {
    await clearSession(page)
    await page.getByRole('button', { name: '学生进入' }).click()
    await page.keyboard.type(STUDENT_CODE)
    await expect(page).toHaveURL(/\/student(\/today)?/, { timeout: 20_000 })
    // 关掉可能出现的新手引�?
    const skip = page.getByRole('button', { name: '稍后再说' })
    if (await skip.isVisible().catch(() => false)) {
      await skip.click()
    }
    await expect(page.locator('.propose-strip')).toBeVisible()
    await page.locator('.propose-strip').click()
    await expect(page.getByRole('heading', { name: '我想加一件小�? })).toBeVisible()
    await expect(page.getByPlaceholder('例如：每天练跳绳 10 分钟')).toBeVisible()
  })

  test('家长看板有「待处理」区�?, async ({ page }) => {
    await clearSession(page)
    await page.getByRole('button', { name: '家长' }).click()
    await page.getByRole('textbox', { name: '账号' }).fill(PARENT_USER)
    await page.getByRole('textbox', { name: '密码' }).fill(PARENT_PASS)
    await page.locator('form').getByRole('button', { name: '登录' }).click()
    await expect(page).toHaveURL(/\/parent(\/monitor)?/)
    await expect(page.getByRole('region', { name: '待处�? })).toBeVisible()
    await expect(
      page.getByText(/暂无待处理|待确认打卡|孩子想加的小�?),
    ).toBeVisible()
  })
})
