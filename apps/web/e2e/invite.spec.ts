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

test.describe('学迹邀请码入口', () => {
  test('学生管理可见生成/输入邀请码', async ({ page }) => {
    await clearSession(page)
    await page.getByRole('button', { name: '家长' }).click()
    await page.getByRole('textbox', { name: '账号' }).fill(PARENT_USER)
    await page.getByRole('textbox', { name: '密码' }).fill(PARENT_PASS)
    await page.locator('form').getByRole('button', { name: '登录' }).click()
    await expect(page).toHaveURL(/\/parent(\/monitor)?/)

    await page.goto('/parent/students')
    // 家庭协作默认折叠时展开
    const collab = page.getByText('邀请另一位家�?)
    await expect(collab).toBeVisible({ timeout: 15_000 })
    await collab.click()
    await expect(page.getByRole('button', { name: '生成邀请码' })).toBeVisible()
    await expect(page.getByRole('button', { name: '输入邀请码' })).toBeVisible()
    await page.getByRole('button', { name: '输入邀请码' }).click()
    await expect(page.getByPlaceholder('6 位邀请码')).toBeVisible()
  })
})
