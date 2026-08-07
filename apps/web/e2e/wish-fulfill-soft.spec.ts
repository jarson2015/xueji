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

test.describe('学迹家长兑现 SoftPrompt', () => {
  test('互助卡多件家务：芯片 SoftPrompt 可读可关', async ({ page }) => {
    await loginAsParent(page)

    await page.route('**/api/redeems', async (route) => {
      if (route.request().method() !== 'GET') return route.continue()
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 8801,
            status: 'pending',
            studentId: 1,
            student: { id: 1, name: '小明' },
            wish: {
              id: 77,
              title: '今日互助卡',
              type: 'golden_finger',
            },
          },
        ]),
      })
    })
    await page.route('**/api/wishes', async (route) => {
      if (route.request().method() !== 'GET') return route.continue()
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      })
    })
    await page.route('**/api/students/*/waivable-chores', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { id: 101, title: '洗碗' },
          { id: 102, title: '拖地' },
        ]),
      })
    })

    await page.goto('/parent/wishes')
    await expect(page.getByRole('heading', { name: /待兑现/ })).toBeVisible({
      timeout: 15_000,
    })
    await expect(page.getByText('家庭互助卡').first()).toBeVisible()

    await page.getByRole('button', { name: '兑现' }).first().click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await expect(
      page.getByRole('heading', { name: '兑现家庭互助卡' }),
    ).toBeVisible()
    await expect(dialog.locator('.sp-msg')).toContainText(/免做不是责任消失/)
    await expect(dialog.locator('.sp-chip', { hasText: '洗碗' })).toBeVisible()
    await expect(dialog.locator('.sp-chip', { hasText: '拖地' })).toBeVisible()
    await expect(
      dialog.getByRole('button', { name: '兑现并免家务' }),
    ).toBeVisible()
    await dialog.getByRole('button', { name: '取消' }).click()
    await expect(dialog).toHaveCount(0)
  })
})
