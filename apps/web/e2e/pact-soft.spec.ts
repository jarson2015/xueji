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

test.describe('学迹学生约定 SoftPrompt', () => {
  test('约定页：借出 / 心意 / 还回 SoftPrompt 文案可读', async ({ page }) => {
    await loginStudent(page)

    const myId = await page.evaluate(() => {
      try {
        return Number(JSON.parse(localStorage.getItem('user') || '{}').id) || 0
      } catch {
        return 0
      }
    })
    expect(myId).toBeGreaterThan(0)

    await page.route('**/api/pacts/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          enabled: true,
          config: {},
          items: [
            {
              id: 9001,
              status: 'pending',
              lenderId: myId,
              borrowerId: myId + 1,
              borrowerName: '小红',
              lenderName: '我',
              amountPoints: 20,
              dueDate: '2026-08-20',
            },
            {
              id: 9002,
              status: 'active',
              lenderId: myId + 1,
              borrowerId: myId,
              borrowerName: '我',
              lenderName: '小红',
              amountPoints: 10,
              amountDue: 12,
              overdueExtraDue: 2,
            },
          ],
        }),
      })
    })
    await page.route('**/api/gifts/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          enabled: true,
          config: {},
          items: [
            {
              id: 9101,
              status: 'pending',
              fromStudentId: myId + 1,
              toStudentId: myId,
              fromName: '小红',
              amountPoints: 5,
            },
          ],
        }),
      })
    })
    await page.route('**/api/pacts/siblings', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          siblings: [{ id: myId + 1, name: '小红' }],
          config: {},
        }),
      })
    })

    await page.goto('/student/pacts')
    await expect(page.getByRole('heading', { name: '积分约定' })).toBeVisible({
      timeout: 15_000,
    })
    await expect(
      page.getByText('借用要还回；赠予分享心意。积分不是钱。'),
    ).toBeVisible()

    const softCases: {
      btn: RegExp
      title: RegExp
      msg: RegExp
      cancel: RegExp
    }[] = [
      {
        btn: /^同意借出$/,
        title: /确认借出/,
        msg: /积分不是钱/,
        cancel: /再想想/,
      },
      {
        btn: /^收下$/,
        title: /收下心意/,
        msg: /不是借的/,
        cancel: /再想想/,
      },
      {
        btn: /^按约定还回$/,
        title: /按约定还回/,
        msg: /说到做到/,
        cancel: /再等等/,
      },
    ]

    for (const c of softCases) {
      const action = page.getByRole('button', { name: c.btn }).first()
      await expect(action).toBeVisible()
      await action.click()
      const dialog = page.getByRole('dialog')
      await expect(dialog).toBeVisible()
      await expect(page.getByRole('heading', { name: c.title })).toBeVisible()
      await expect(dialog.locator('.sp-msg')).toContainText(c.msg)
      await dialog.getByRole('button', { name: c.cancel }).click()
      await expect(dialog).toHaveCount(0)
    }
  })
})
