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

test.describe('学迹家庭手账 P0.5', () => {
  test('时间线可加载；删日记 SoftPrompt 文案', async ({ page }) => {
    await page.route('**/api/journal/posts**', async (route) => {
      const url = route.request().url()
      const before = /beforeId=(\d+)/.exec(url)
      if (before) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            code: 0,
            data: [{ id: 1, authorId: 2, authorName: '小明', body: '更早一�?, visibility: 'family', commentCount: 0, createdAt: new Date().toISOString() }],
          }),
        })
        return
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 0,
          data: Array.from({ length: 30 }, (_, i) => ({
            id: 100 - i,
            authorId: 2,
            authorName: '小明',
            body: `手账 ${100 - i}`,
            visibility: 'family',
            commentCount: 0,
            createdAt: new Date().toISOString(),
          })),
        }),
      })
    })
    await page.route('**/api/journal/private-diary/prefs', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 0,
          data: { privateDiaryEnabled: true },
        }),
      })
    })
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
            items: [
              {
                id: 9,
                body: '想安静一会儿',
                moodTag: null,
                createdAt: new Date().toISOString(),
                canEdit: true,
              },
            ],
          },
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

    await loginStudent(page)
    await page.goto('/student/journal')
    await expect(page.locator('h2.page-title')).toHaveText('家庭说说', { timeout: 15_000 })
    await expect(page.getByText('手账 100')).toBeVisible()
    await page.getByRole('button', { name: '加载更多' }).click()
    await expect(page.getByText('更早一�?)).toBeVisible({ timeout: 10_000 })

    await page.getByText('我的私密日记').click()
    await page.getByRole('button', { name: '删除' }).first().click()
    await expect(page.getByRole('heading', { name: '删除私密日记�? })).toBeVisible()
    await expect(page.locator('.sp-msg')).toContainText('安静')
    await page.getByRole('button', { name: '保留' }).click()
  })
})
