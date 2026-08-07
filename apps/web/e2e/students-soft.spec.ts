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

async function loginAsParent(page: Page) {
  await clearSession(page)
  await page.getByRole('button', { name: '家长' }).click()
  await page.getByRole('textbox', { name: '账号' }).fill(PARENT_USER)
  await page.getByRole('textbox', { name: '密码' }).fill(PARENT_PASS)
  await page.locator('form').getByRole('button', { name: '登录' }).click()
  await expect(page).toHaveURL(/\/parent(\/monitor)?/)
}

test.describe('学迹学生管理 SoftPrompt', () => {
  test('刷新登录码 / 重置密码走 SoftPrompt', async ({ page }) => {
    const nativeDialogs: string[] = []
    page.on('dialog', async (d) => {
      nativeDialogs.push(d.type())
      await d.dismiss()
    })

    await loginAsParent(page)
    await page.goto('/parent/students')
    await expect(page.getByRole('button', { name: '更多操作' }).first()).toBeVisible({
      timeout: 15_000,
    })

    await page.getByRole('button', { name: '更多操作' }).first().click()
    await page.getByRole('menuitem', { name: '刷新登录码' }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await expect(page.getByRole('heading', { name: '刷新登录码' })).toBeVisible()
    await expect(dialog.locator('.sp-msg')).toContainText(/立刻失效/)
    await expect(dialog.getByRole('button', { name: '刷新' })).toBeVisible()
    await dialog.getByRole('button', { name: /取消|再想想/ }).click()
    await expect(dialog).toHaveCount(0)

    await page.getByRole('button', { name: '更多操作' }).first().click()
    await page.getByRole('menuitem', { name: '重置密码' }).click()
    await expect(dialog).toBeVisible()
    await expect(page.getByRole('heading', { name: /重置.*密码/ })).toBeVisible()
    await expect(dialog.locator('.sp-msg')).toContainText(/至少 6 位/)
    await expect(dialog.getByPlaceholder('输入新密码')).toBeVisible()
    await expect(dialog.getByRole('button', { name: '重置' })).toBeVisible()
    await dialog.getByRole('button', { name: /取消|再想想/ }).click()
    await expect(dialog).toHaveCount(0)

    expect(nativeDialogs).toEqual([])
  })
})
