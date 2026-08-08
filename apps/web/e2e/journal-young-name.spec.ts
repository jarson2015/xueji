import { test, expect, type Page } from '@playwright/test'

const STUDENT_CODE = process.env.E2E_STUDENT_CODE || '10293847'

async function loginStudent(page: Page) {
  await page.goto('/login')
  await page.evaluate(() => {
    localStorage.clear()
    sessionStorage.clear()
    localStorage.setItem('onboardStudentV2', 'done')
    localStorage.setItem('guideStudentDone', '1')
    localStorage.setItem('ageBand', 'young')
  })
  await page.goto('/login')
  await page.getByRole('button', { name: '学生进入' }).click()
  await page.keyboard.type(STUDENT_CODE)
  await expect(page).toHaveURL(/\/student(\/today)?/, { timeout: 20_000 })
  const skip = page.getByRole('button', { name: '稍后再说' })
  if (await skip.isVisible().catch(() => false)) await skip.click()
}

test.describe('学迹家庭说说分龄命名', () => {
  test('幼龄：More / 页标题为「给家人看�?, async ({ page }) => {
    await page.route('**/api/journal/posts**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ code: 0, data: [] }),
      })
    })
    await page.route('**/api/journal/private-diary**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 0,
          data: { privateDiaryEnabled: false, readonly: true, items: [] },
        }),
      })
    })
    await page.route('**/api/journal/mark-seen', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ code: 0, data: { ok: true } }),
      })
    })
    await page.route('**/api/journal/activity-hint', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ code: 0, data: { newReplyCount: 0 } }),
      })
    })

    await loginStudent(page)
    await page.goto('/student/more')
    await expect(
      page.getByRole('heading', { name: '给家人看', exact: true }),
    ).toBeVisible({ timeout: 15_000 })
    await page.getByRole('heading', { name: '给家人看', exact: true }).click()
    await expect(page).toHaveURL(/\/student\/journal/)
    await expect(page.locator('h2.page-title')).toHaveText('给家人看')
    await expect(page.getByText(/写给家人看的小事/)).toBeVisible()
    await page.getByText('我的悄悄�?).click()
    await expect(page.getByRole('button', { name: '自愿开�? })).toBeVisible()
  })
})
