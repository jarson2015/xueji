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

type DiaryState = {
  enabled: boolean
  readonly: boolean
  items: any[]
}

async function mockJournalApi(
  page: Page,
  opts: {
    newReplyCount?: number
    posts?: any[]
    diary?: DiaryState
  } = {},
) {
  const diary: DiaryState = opts.diary || {
    enabled: true,
    readonly: false,
    items: [],
  }
  const posts =
    opts.posts ||
    ([
      {
        id: 10,
        authorId: 2,
        authorName: '小明',
        body: '刚写的可编辑帖',
        visibility: 'family',
        commentCount: 0,
        canEdit: true,
        createdAt: new Date().toISOString(),
      },
      {
        id: 9,
        authorId: 2,
        authorName: '小明',
        body: '超时不可编辑帖',
        visibility: 'family',
        commentCount: 0,
        canEdit: false,
        createdAt: new Date(Date.now() - 40 * 60 * 1000).toISOString(),
      },
    ] as any[])

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
          data: {
            newReplyCount: opts.newReplyCount ?? 0,
            weekPostCount: 0,
          },
        }),
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

    if (url.includes('/journal/mark-seen')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ code: 0, data: { ok: true } }),
      })
      return
    }

    if (url.includes('/journal/private-diary/prefs') && method === 'PATCH') {
      const body = route.request().postDataJSON() as {
        privateDiaryEnabled?: boolean
      }
      diary.enabled = !!body?.privateDiaryEnabled
      diary.readonly = !diary.enabled
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 0,
          data: {
            privateDiaryEnabled: diary.enabled,
            privateDiaryEnabledAt: diary.enabled ? new Date().toISOString() : null,
          },
        }),
      })
      return
    }

    if (url.includes('/journal/private-diary') && method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 0,
          data: {
            privateDiaryEnabled: diary.enabled,
            readonly: diary.readonly,
            items: diary.items,
          },
        }),
      })
      return
    }

    if (/\/journal\/posts\/\d+$/.test(new URL(url).pathname) && method === 'PATCH') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 0,
          data: { ...posts[0], body: '已改好的手账' },
        }),
      })
      return
    }

    if (url.includes('/journal/posts') && method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ code: 0, data: posts }),
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

test.describe('学迹家庭说说 P1 回归', () => {
  test('关闭私密：SoftPrompt → 确认后只读保留', async ({ page }) => {
    await mockJournalApi(page, {
      diary: {
        enabled: true,
        readonly: false,
        items: [
          {
            id: 1,
            body: '保留的旧日记',
            canEdit: true,
            createdAt: new Date().toISOString(),
          },
        ],
      },
    })
    await seedStudent(page)
    await page.goto('/student/journal')
    await expect(page.getByText('我的私密日记')).toBeVisible({ timeout: 15_000 })
    await page.getByText('我的私密日记').click()
    await page.getByRole('button', { name: '关闭私密日记' }).click()
    await expect(page.getByRole('heading', { name: '关闭私密日记？' })).toBeVisible()
    await expect(page.locator('.sp-msg')).toContainText('只读')
    await page.getByRole('button', { name: '确认关闭' }).click()
    await expect(page.getByText(/已关闭 · 只读保留/)).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText('保留的旧日记')).toBeVisible()
  })

  test('短时编辑：可编辑帖有按钮；超时帖无编辑', async ({ page }) => {
    await mockJournalApi(page)
    await seedStudent(page)
    await page.goto('/student/journal')
    await expect(page.getByText('刚写的可编辑帖')).toBeVisible({ timeout: 15_000 })

    const editableCard = page.locator('.post-card').filter({ hasText: '刚写的可编辑帖' })
    await expect(editableCard.getByRole('button', { name: '编辑' })).toBeVisible()

    const staleCard = page.locator('.post-card').filter({ hasText: '超时不可编辑帖' })
    await expect(staleCard.getByRole('button', { name: '编辑' })).toHaveCount(0)

    await editableCard.getByRole('button', { name: '编辑' }).click()
    await expect(page.getByText('编辑手账')).toBeVisible()
    await page.locator('.el-drawer').getByRole('textbox').fill('已改好的手账')
    await page.getByRole('button', { name: '保存修改' }).click()
    await expect(page.getByText('已保存')).toBeVisible({ timeout: 10_000 })
  })

  test('More：有新回应时家庭说说带角标', async ({ page }) => {
    await mockJournalApi(page, { newReplyCount: 3 })
    await seedStudent(page)
    await page.goto('/student/more')
    await expect(page.getByText('家庭说说')).toBeVisible({ timeout: 15_000 })
    await expect(page.locator('.journal-badge')).toBeVisible()
    await expect(page.locator('.journal-badge')).toContainText('3')
  })
})
