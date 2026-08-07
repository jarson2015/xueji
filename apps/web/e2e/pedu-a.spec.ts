import { test, expect, type Page } from '@playwright/test'

async function seedParent(page: Page, extraLocal?: Record<string, string>) {
  await page.addInitScript((extra) => {
    localStorage.setItem('onboardParentV2', 'done')
    localStorage.setItem('guideParentDone', '1')
    localStorage.setItem('token', 'e2e-fake-token')
    localStorage.setItem(
      'user',
      JSON.stringify({
        id: 1,
        username: 'parent@demo.com',
        name: '家长',
        role: 'parent',
      }),
    )
    if (extra) {
      for (const [k, v] of Object.entries(extra)) {
        localStorage.setItem(k, v)
      }
    }
  }, extraLocal || {})
}

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

async function mockApi(page: Page, opts?: { fade?: boolean }) {
  const fade = opts?.fade !== false
  await page.route((url) => {
    try {
      return new URL(url).pathname.startsWith('/api/')
    } catch {
      return false
    }
  }, async (route) => {
    const url = route.request().url()
    const method = route.request().method()

    if (url.includes('/dashboard/monitor')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 0,
          data: {
            date: '2026-08-03',
            family: { headline: '今天节奏平稳', totalDue: 0, totalDone: 0 },
            children: [
              {
                studentId: 2,
                name: '小明',
                isRestDay: false,
                stats: {
                  due: 0,
                  done: 0,
                  pendingConfirms: 0,
                  pointsBalance: 0,
                  streak: 0,
                },
                byCategory: {},
                todayTasks: [],
                timeline: [],
              },
            ],
            pendingConfirms: [],
            pendingProposals: [],
            rewardMode: 'always',
            hints: {},
            rewardFadeHint: fade
              ? {
                  show: true,
                  message: '可以试试「有时加分」',
                  suggestMode: 'sometimes',
                }
              : null,
          },
        }),
      })
      return
    }

    if (url.includes('/journal/posts') && method === 'GET' && !url.includes('/comments')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 0,
          data: [
            {
              id: 10,
              authorId: 2,
              authorName: '小明',
              body: '今天练琴有点累',
              visibility: 'family',
              commentCount: 0,
              canEdit: false,
              createdAt: new Date().toISOString(),
            },
          ],
        }),
      })
      return
    }

    if (url.includes('/journal/posts/') && url.includes('/comments')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ code: 0, data: [] }),
      })
      return
    }

    if (url.includes('/journal/notify-prefs')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 0,
          data: { commentPushEnabled: true },
        }),
      })
      return
    }

    if (url.includes('/journal/private-diary') || url.includes('/journal/activity-hint')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 0,
          data: url.includes('private')
            ? { privateDiaryEnabled: false, readonly: true, items: [] }
            : { hasRecent: false },
        }),
      })
      return
    }

    if (url.includes('/my/weekend-review')) {
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
            journalPostId: null,
            journalPostSummary: null,
            weekPatternHint: '这周缓做用得比较多，节奏可能偏紧。小会里可以只挑一件聊聊。',
          },
        }),
      })
      return
    }

    if (url.includes('/my/weekly-goal') || url.includes('/journal/posts')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 0,
          data: url.includes('weekly-goal')
            ? { text: '', themeTitle: '', themePreset: '' }
            : [],
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
            id: 1,
            username: 'parent@demo.com',
            name: '家长',
            role: 'parent',
          },
        }),
      })
      return
    }

    if (url.includes('/students') && method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 0,
          data: [{ id: 2, name: '小明' }],
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

test.describe('学迹 P-Edu-A 教育打磨', () => {
  test('家长回应区可见情绪教练芯片', async ({ page }) => {
    await mockApi(page)
    await seedParent(page)
    await page.goto('/parent/journal')
    await expect(page.getByText('今天练琴有点累')).toBeVisible({
      timeout: 15_000,
    })
    await page.getByRole('button', { name: /回应/ }).first().click()
    await expect(page.getByRole('button', { name: '听起来你有点…' })).toBeVisible()
    await expect(page.getByRole('button', { name: '我在，不着急' })).toBeVisible()
    await expect(page.getByRole('button', { name: '看见你了' })).toHaveCount(0)
  })

  test('学生回应区仍为温暖芯片', async ({ page }) => {
    await mockApi(page)
    await seedStudent(page)
    await page.goto('/student/journal')
    await expect(page.getByText('今天练琴有点累')).toBeVisible({
      timeout: 15_000,
    })
    await page.getByRole('button', { name: /回应/ }).first().click()
    await expect(page.getByRole('button', { name: '看见你了' })).toBeVisible()
    await expect(page.getByRole('button', { name: '听起来你有点…' })).toHaveCount(0)
  })

  test('周末小会：本周模式一句 + 分步计时', async ({ page }) => {
    await mockApi(page)
    await seedStudent(page)
    await page.goto('/student/weekend-meeting')
    await expect(
      page.getByText(/这周缓做用得比较多/),
    ).toBeVisible({ timeout: 15_000 })
    const timer = page.getByRole('group', { name: '本步计时' })
    await expect(timer).toBeVisible()
    await expect(timer.getByText('3:00')).toBeVisible()
    await timer.getByRole('button', { name: '开始计时' }).click()
    await expect(timer.getByRole('button', { name: '暂停' })).toBeVisible()
  })

  test('淡出：满 7 天可见二次软提醒文案', async ({ page }) => {
    const eightDaysAgo = String(Date.now() - 8 * 24 * 60 * 60 * 1000)
    await mockApi(page, { fade: true })
    await seedParent(page, { xueji_fade_dismiss_at: eightDaysAgo })
    await page.goto('/parent/monitor')
    const sense = page.getByRole('region', { name: '家庭洞察' })
    await expect(sense).toBeVisible({ timeout: 15_000 })
    const chip = sense.getByRole('tab', { name: '节奏' })
    if (await chip.isVisible().catch(() => false)) {
      await chip.click()
    }
    await expect(sense.getByText('加分节奏再提醒')).toBeVisible()
    await expect(sense.getByText(/上次提过加分节奏/)).toBeVisible()
  })
})
