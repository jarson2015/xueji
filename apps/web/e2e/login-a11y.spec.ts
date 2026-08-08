import { test, expect, type Page } from '@playwright/test'

async function clearSession(page: Page) {
  await page.goto('/login')
  await page.evaluate(() => {
    localStorage.clear()
    sessionStorage.clear()
  })
  await page.goto('/login')
}

test.describe('学迹登录码可读名�?, () => {
  test('码区�?�?清空�?aria-label', async ({ page }) => {
    await clearSession(page)
    await page.getByRole('button', { name: '学生进入' }).click()
    await expect(page.getByRole('group', { name: '6 位登录码' })).toBeVisible()
    await expect(page.getByRole('button', { name: '删除一�? })).toBeVisible()
    await expect(page.getByRole('button', { name: '清空登录�? })).toBeVisible()
    await expect(page.getByRole('button', { name: '数字 1' })).toBeVisible()
    await expect(page.getByRole('button', { name: '数字 0' })).toBeVisible()
  })
})
