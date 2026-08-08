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
    localStorage.setItem('onboardStudentV2', 'done')
    localStorage.setItem('guideStudentDone', '1')
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

async function enterAsFirstStudent(page: Page) {
  await page.goto('/parent/students')
  const enter = page.getByRole('button', { name: '帮孩子进入今�? }).first()
  await expect(enter).toBeVisible({ timeout: 15_000 })
  await enter.click()
  await expect(page).toHaveURL(/\/student/, { timeout: 20_000 })
  await expect(page.getByText(/家长代登�?)).toBeVisible()
}

test.describe('学迹代登退�?, () => {
  test('正常退出回到家长学生管�?, async ({ page }) => {
    await loginAsParent(page)
    await enterAsFirstStudent(page)
    await page.getByRole('button', { name: '退出代�? }).click()
    await expect(page).toHaveURL(/\/parent\/students/, { timeout: 15_000 })
    await expect(page.getByText(/家长代登�?)).toHaveCount(0)
  })

  test('备份损坏则回登录，不假进家长�?, async ({ page }) => {
    await loginAsParent(page)
    await enterAsFirstStudent(page)
    await page.evaluate(() => {
      localStorage.setItem('parentProxyBackup', '{broken')
    })
    await page.getByRole('button', { name: '退出代�? }).click()
    await expect(page).toHaveURL(/\/login/, { timeout: 15_000 })
    await expect(page).not.toHaveURL(/\/parent/)
  })

  test('无备份则回登�?, async ({ page }) => {
    await loginAsParent(page)
    await enterAsFirstStudent(page)
    await page.evaluate(() => {
      localStorage.removeItem('parentProxyBackup')
    })
    await page.getByRole('button', { name: '退出代�? }).click()
    await expect(page).toHaveURL(/\/login/, { timeout: 15_000 })
    await expect(page).not.toHaveURL(/\/parent/)
  })
})
