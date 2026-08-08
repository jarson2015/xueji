import { test, expect, type Page } from '@playwright/test'

async function seedStudent(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem('onboardStudentV2', 'done')
    localStorage.setItem('guideStudentDone', '1')
    localStorage.setItem('ageBand', 'general')
    localStorage.setItem('token', 'e2e-fake-token')
    localStorage.setItem(
      'user',
      JSON.stringify({
        id: 2,
        username: 'student1',
        name: '小明',
        role: 'student',
        pointsBalance: 0,
      }),
    )
  })
}

async function mockApi(page: Page, opts?: { notify?: boolean }) {
  const notifyOn = opts?.notify !== false
  await page.route((url) => {
    try {
      return new URL(url).pathname.startsWith('/api/')
    } catch {
      return false
    }
  }, async (route) => {
    const url = route.request().url()
    const method = route.request().method()

    if (url.includes('/journal/notify-prefs')) {
      if (method === 'PATCH') {
        const body = route.request().postDataJSON() as {
          commentPushEnabled?: boolean
        }
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            code: 0,
            data: {
              commentPushEnabled: body?.commentPushEnabled !== false,
            },
          }),
        })
        return
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 0,
          data: { commentPushEnabled: notifyOn },
        }),
      })
      return
    }

    if (/\/journal\/posts\/99(\/|$|\?)/.test(url) && method === 'GET') {
      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ code: 404, message: '手账不存�?, data: null }),
      })
      return
    }

    if (url.includes('/journal/posts') && method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ code: 0, data: [] }),
      })
      return
    }

    if (url.includes('/journal/private-diary')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 0,
          data: { privateDiaryEnabled: false, readonly: true, items: [] },
        }),
      })
      return
    }

    if (url.includes('/my/weekend-review')) {
      if (method === 'PUT') {
        const body = route.request().postDataJSON() as any
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            code: 0,
            data: {
              weekKey: '2026-W32',
              proudText: body?.proudText || '',
              changeText: body?.changeText || '',
              promiseText: body?.promiseText || '',
              journalPostId: body?.journalPostId ?? null,
              journalPostSummary: body?.journalPostSummary || null,
            },
          }),
        })
        return
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 0,
          data: {
            weekKey: '2026-W32',
            proudText: '',
            changeText: '',
            promiseText: '',
            journalPostId: 99,
            journalPostSummary: '固化摘要：跳绳坚持了',
          },
        }),
      })
      return
    }

    if (url.includes('/my/weekly-goal')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 0,
          data: { text: '', themeTitle: '', themePreset: '' },
        }),
      })
      return
    }

    if (url.includes('/auth/me')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 0,
          data: {
            id: 2,
            username: 'student1',
            name: '小明',
            role: 'student',
            pointsBalance: 0,
          },
        }),
      })
      return
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ code: 0, data: {} }),
    })
  })
}

test.describe('学迹家庭说说 P3', () => {
  test('手账页可见新回应提醒开�?, async ({ page }) => {
    await mockApi(page)
    await seedStudent(page)
    await page.goto('/student/journal')
    await expect(page.getByText('新回应提�?)).toBeVisible({ timeout: 15_000 })
    await expect(page.locator('.notify-prefs .el-switch')).toBeVisible()
  })

  test('周末小会：原帖已删仍显示固化摘要', async ({ page }) => {
    await mockApi(page)
    await seedStudent(page)
    await page.goto('/student/weekend-meeting')
    await expect(page.getByText(/固化摘要：跳绳坚持了/)).toBeVisible({
      timeout: 15_000,
    })
    await expect(page.getByText(/原帖已删/)).toBeVisible()
  })
})
