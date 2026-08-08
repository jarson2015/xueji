import { test, expect, type Page } from '@playwright/test'

const STUDENT_CODE = process.env.E2E_STUDENT_CODE || '10293847'

async function loginStudent(page: Page) {
  await page.goto('/login')
  await page.evaluate(() => {
    localStorage.clear()
    sessionStorage.clear()
    localStorage.setItem('onboardStudentV2', 'done')
    localStorage.setItem('guideStudentDone', '1')
  })
  await page.goto('/login')
  await page.getByRole('button', { name: '学生进入' }).click()
  await page.keyboard.type(STUDENT_CODE)
  await expect(page).toHaveURL(/\/student(\/today)?/, { timeout: 20_000 })
  const skip = page.getByRole('button', { name: '稍后再说' })
  if (await skip.isVisible().catch(() => false)) await skip.click()
}

async function mockJournalBase(page: Page) {
  await page.route('**/api/journal/posts**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ code: 0, data: [] }),
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
}

test.describe('学迹家庭手账私密 SoftPrompt P1', () => {
  test('自愿开启弹层文案含知情同意', async ({ page }) => {
    await mockJournalBase(page)
    await page.route('**/api/journal/private-diary', async (route) => {
      if (route.request().method() !== 'GET') {
        await route.continue()
        return
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 0,
          data: { privateDiaryEnabled: false, readonly: true, items: [] },
        }),
      })
    })

    await loginStudent(page)
    await page.goto('/student/journal')
    await expect(page.getByText('我的私密日记')).toBeVisible({ timeout: 15_000 })
    await page.getByText('我的私密日记').click()
    await page.getByRole('button', { name: '自愿开�? }).click()
    await expect(page.getByRole('heading', { name: '自愿开启私密日�? })).toBeVisible()
    await expect(page.getByText(/只有你本�?)).toBeVisible()
    await expect(page.getByText(/代登/)).toBeVisible()
    await page.getByRole('button', { name: '再想�? }).click()
    await expect(page.getByRole('heading', { name: '自愿开启私密日�? })).toHaveCount(0)
  })

  test('关闭私密 SoftPrompt 含只读口径；发帖话术芯片可见', async ({ page }) => {
    await mockJournalBase(page)
    await page.route('**/api/journal/private-diary', async (route) => {
      if (route.request().method() !== 'GET') {
        await route.continue()
        return
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 0,
          data: {
            privateDiaryEnabled: true,
            readonly: false,
            items: [],
          },
        }),
      })
    })

    await loginStudent(page)
    await page.goto('/student/journal')
    await expect(page.getByText('我的私密日记')).toBeVisible({ timeout: 15_000 })
    await page.getByText('我的私密日记').click()
    await page.getByRole('button', { name: '关闭私密日记' }).click()
    await expect(page.getByRole('heading', { name: '关闭私密日记�? })).toBeVisible()
    await expect(page.locator('.sp-msg')).toContainText('只读')
    await page.getByRole('button', { name: '保持开�? }).click()

    await page.getByRole('button', { name: '写一�? }).click()
    await expect(page.getByRole('button', { name: '今天骄傲的一件小�? })).toBeVisible()
  })
})
