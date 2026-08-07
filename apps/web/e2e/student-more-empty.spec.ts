import { test, expect, type Page } from '@playwright/test'

const STUDENT_CODE = process.env.E2E_STUDENT_CODE || '102938'

async function clearSession(page: Page) {
  await page.goto('/login')
  await page.evaluate(() => {
    localStorage.clear()
    sessionStorage.clear()
    localStorage.setItem('onboardStudentV2', 'done')
    localStorage.setItem('guideStudentDone', '1')
  })
  await page.goto('/login')
}

async function loginStudent(page: Page) {
  await clearSession(page)
  await page.getByRole('button', { name: '学生进入' }).click()
  await page.keyboard.type(STUDENT_CODE)
  await expect(page).toHaveURL(/\/student(\/today)?/, { timeout: 20_000 })
  const skip = page.getByRole('button', { name: '稍后再说' })
  if (await skip.isVisible().catch(() => false)) await skip.click()
}

async function mockFeaturesOff(page: Page) {
  await page.route('**/api/allowance/me', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ enabled: false }),
    })
  })
  await page.route('**/api/pacts/me', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ enabled: false, items: [], config: {} }),
    })
  })
}

test.describe('学迹学生 More / 关功能空态', () => {
  test('未开功能：More 无可选；空态 CTA 不进公约', async ({ page }) => {
    await loginStudent(page)
    await mockFeaturesOff(page)

    await page.goto('/student/more')
    await expect(page.getByRole('heading', { name: '更多功能' })).toBeVisible({
      timeout: 15_000,
    })
    await expect(page.getByRole('heading', { name: '可选' })).toHaveCount(0)
    await expect(page.getByRole('heading', { name: '零花账本' })).toHaveCount(0)
    await expect(page.getByRole('heading', { name: '积分约定' })).toHaveCount(0)

    await page.goto('/student/allowance')
    await expect(page.getByText(/还没打开零花钱/)).toBeVisible({ timeout: 15_000 })
    await page.getByRole('button', { name: '去愿望商店' }).click()
    await expect(page).toHaveURL(/\/student\/rewards/)
    await expect(page).not.toHaveURL(/covenant/)

    await page.goto('/student/pacts')
    await expect(page.getByText(/暂未开启积分约定/)).toBeVisible({ timeout: 15_000 })
    await page.getByRole('button', { name: '回到今日' }).click()
    await expect(page).toHaveURL(/\/student\/today/)
    await expect(page).not.toHaveURL(/covenant/)
  })
})
