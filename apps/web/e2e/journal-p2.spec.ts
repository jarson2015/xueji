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
    Object.keys(localStorage)
      .filter((k) => k.startsWith('xueji_journal_soft_tip_dismiss_'))
      .forEach((k) => localStorage.removeItem(k))
  })
}

/** �?token 时必须挡住所有后�?/api，否�?401 会登出；勿匹�?/src/api 模块 */
async function mockApiSafe(page: Page) {
  await page.route((url) => {
    try {
      return new URL(url).pathname.startsWith('/api/')
    } catch {
      return false
    }
  }, async (route) => {
    const url = route.request().url()
    const method = route.request().method()

    if (url.includes('/journal/activity-hint')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 0,
          data: { newReplyCount: 0, weekPostCount: 2 },
        }),
      })
      return
    }

    if (url.includes('/journal/posts') && method === 'GET') {
      if (/\/posts\/42\/comments/.test(url)) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ code: 0, data: [] }),
        })
        return
      }
      if (/\/posts\/42(\?|$)/.test(url)) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            code: 0,
            data: {
              id: 42,
              authorId: 2,
              authorName: '小明',
              body: '深链目标�?,
              visibility: 'family',
              commentCount: 0,
              createdAt: new Date().toISOString(),
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
          data: [
            {
              id: 42,
              authorId: 2,
              authorName: '小明',
              body: '深链目标�?,
              visibility: 'family',
              commentCount: 0,
              createdAt: new Date().toISOString(),
            },
          ],
        }),
      })
      return
    }

    if (url.includes('/journal/private-diary')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 0,
          data: { privateDiaryEnabled: false, readonly: false, items: [] },
        }),
      })
      return
    }

    if (url.includes('/journal/mark-seen')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ code: 0, data: { ok: true } }),
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

    if (url.includes('/my/today')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 0,
          data: {
            date: new Date().toISOString().slice(0, 10),
            tasks: [],
            planItems: [],
            ageBand: 'general',
            pointsBalance: 0,
            streak: 0,
            isRestDay: false,
            restPauseAll: false,
            restPauseCategories: [],
            sharedDoneHints: [],
            rotateHints: [],
            makeupHints: [],
            makeupEnabled: true,
            makeupDiscountPercent: 50,
            dailySkipLimit: 1,
            skipsUsedToday: 0,
            reflectionEnabled: false,
          },
        }),
      })
      return
    }

    if (url.includes('/my/task-proposals')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ code: 0, data: [] }),
      })
      return
    }

    if (url.includes('/my/daily-focus')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ code: 0, data: { keys: [], swaps: 0 } }),
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

    if (url.includes('/growth/portfolio')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 0,
          data: {
            weekTheme: null,
            themeHistory: [],
            milestones: [],
            photos: [],
            reflections: [],
            stats: { photoCount: 0, milestoneCount: 0, reflectionCount: 0 },
          },
        }),
      })
      return
    }

    if (url.includes('/growth/')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ code: 0, data: [] }),
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

test.describe('学迹家庭说说 P2', () => {
  test('?postId= 深链打开帖详�?, async ({ page }) => {
    await mockApiSafe(page)
    await seedStudent(page)
    await page.goto('/student/journal?postId=42')
    await expect(page.getByText('深链目标�?).first()).toBeVisible({ timeout: 15_000 })
  })

  test('今日软发现：本周有说说时出现提示', async ({ page }) => {
    await mockApiSafe(page)
    await seedStudent(page)
    await page.goto('/student/today')
    await expect(page.getByText(/本周�?2 �?)).toBeVisible({
      timeout: 15_000,
    })
  })

  test('作品集有去家庭说说弱�?, async ({ page }) => {
    await mockApiSafe(page)
    await seedStudent(page)
    await page.goto('/student/growth?tab=portfolio')
    await expect(page.getByRole('button', { name: /去家庭说�? })).toBeVisible({
      timeout: 15_000,
    })
  })
})
