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

test.describe('学迹 SoftPrompt 交互', () => {
  test('家长退出用 SoftPrompt，Esc 可关，说明可读', async ({ page }) => {
    const nativeDialogs: string[] = []
    page.on('dialog', async (d) => {
      nativeDialogs.push(d.type())
      await d.dismiss()
    })

    await loginAsParent(page)
    await page.getByRole('button', { name: '退出' }).first().click()

    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await expect(page.getByRole('heading', { name: '退出' })).toBeVisible()
    await expect(dialog).toHaveAttribute('aria-describedby', /.+/)
    await expect(dialog.locator('.sp-msg')).toBeVisible()

    await page.keyboard.press('Escape')
    await expect(dialog).toHaveCount(0)
    expect(nativeDialogs).toEqual([])
  })

  test('SoftPrompt 无输入时确认按钮可聚焦关闭路径', async ({ page }) => {
    await loginAsParent(page)
    await page.getByRole('button', { name: '退出' }).first().click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await page.getByRole('button', { name: '取消' }).click()
    await expect(dialog).toHaveCount(0)
  })
})
