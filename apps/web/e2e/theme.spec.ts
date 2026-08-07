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

async function dismissStudentGuide(page: Page) {
  const skip = page.getByRole('button', { name: '稍后再说' })
  if (await skip.isVisible().catch(() => false)) {
    await skip.click()
  }
}

test.describe('学迹主题周抽样', () => {
  test('学生今日可打开本周主题抽屉并见预设', async ({ page }) => {
    await clearSession(page)
    await page.getByRole('button', { name: '学生进入' }).click()
    await page.keyboard.type(STUDENT_CODE)
    await expect(page).toHaveURL(/\/student(\/today)?/, { timeout: 20_000 })
    await dismissStudentGuide(page)

    await expect(page.locator('.weekly-goal')).toBeVisible()
    await page.locator('.weekly-goal').getByRole('button', { name: /定一个|去改/ }).click()
    await expect(page.getByRole('button', { name: '保存本周主题' })).toBeVisible()
    await expect(page.getByRole('button', { name: '小整理' })).toBeVisible()
    await expect(page.getByRole('button', { name: '先不定' })).toBeVisible()
  })

  test('家长看板孩子卡可打开主题抽屉', async ({ page }) => {
    await clearSession(page)
    await page.getByRole('button', { name: '家长' }).click()
    await page.getByRole('textbox', { name: '账号' }).fill(PARENT_USER)
    await page.getByRole('textbox', { name: '密码' }).fill(PARENT_PASS)
    await page.locator('form').getByRole('button', { name: '登录' }).click()
    await expect(page).toHaveURL(/\/parent(\/monitor)?/)

    const themeRow = page.locator('.theme-row').first()
    await expect(themeRow).toBeVisible({ timeout: 15_000 })
    await themeRow.click()
    await expect(page.getByRole('button', { name: '保存本周主题' })).toBeVisible()
    await expect(page.getByRole('button', { name: '准时开始' })).toBeVisible()
    await page.getByRole('button', { name: '小整理' }).click()
    await expect(
      page.getByText(/点一下打开发布页并预填标题/),
    ).toBeVisible()
  })
})
