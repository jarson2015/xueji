import { test, expect, type Page } from '@playwright/test'

const PARENT_USER = process.env.E2E_PARENT_USER || 'parent@demo.com'
const PARENT_PASS = process.env.E2E_PARENT_PASS || 'demo1234'
const STUDENT_CODE = process.env.E2E_STUDENT_CODE || '10293847'

async function clearSession(page: Page) {
  await page.goto('/login')
  await page.evaluate(() => {
    localStorage.clear()
    sessionStorage.clear()
    localStorage.setItem('onboardParentV2', 'done')
    localStorage.setItem('guideParentDone', '1')
    localStorage.setItem('onboardStudentV2', 'done')
    localStorage.setItem('guideStudentDone', '1')
  })
  await page.goto('/login')
}

test.describe('学迹休息�?/ 删任�?SoftPrompt', () => {
  test('学生任务档案：休息日·拿到今日 SoftPrompt', async ({ page }) => {
    await clearSession(page)
    await page.getByRole('button', { name: '学生进入' }).click()
    await page.keyboard.type(STUDENT_CODE)
    await expect(page).toHaveURL(/\/student(\/today)?/, { timeout: 20_000 })
    const skip = page.getByRole('button', { name: '稍后再说' })
    if (await skip.isVisible().catch(() => false)) await skip.click()

    await page.route('**/api/my/tasks', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            assignId: 501,
            title: '朗读 10 分钟',
            category: 'study',
            schedule: 'daily',
            timeSlot: 'anytime',
            targetValue: 1,
            progressPercent: 0,
            pointsReward: 5,
            status: 'active',
            sharedDone: false,
            isExpired: false,
            canMakeup: false,
          },
        ]),
      })
    })
    await page.route('**/api/my/today**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          isRestDay: true,
          makeupEnabled: true,
          slotExtendedEnabled: false,
          items: [],
        }),
      })
    })

    await page.goto('/student/tasks')
    await expect(page.getByRole('heading', { name: '任务档案' })).toBeVisible({
      timeout: 15_000,
    })
    await page.locator('.slot-tabs .el-radio-button__inner').filter({ hasText: '全部' }).click()
    await expect(
      page.getByRole('button', { name: '休息日·拿到今�? }),
    ).toBeVisible()
    await page.getByRole('button', { name: '休息日·拿到今�? }).click()

    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await expect(page.getByRole('heading', { name: '休息�? })).toBeVisible()
    await expect(dialog.locator('.sp-msg')).toContainText(/先不�?)
    await expect(dialog.getByRole('button', { name: '拿到今日' })).toBeVisible()
    await dialog.getByRole('button', { name: '先休�? }).click()
    await expect(dialog).toHaveCount(0)
  })

  test('家长任务：单条删�?SoftPrompt', async ({ page }) => {
    await clearSession(page)
    await page.getByRole('button', { name: '家长' }).click()
    await page.getByRole('textbox', { name: '账号' }).fill(PARENT_USER)
    await page.getByRole('textbox', { name: '密码' }).fill(PARENT_PASS)
    await page.locator('form').getByRole('button', { name: '登录' }).click()
    await expect(page).toHaveURL(/\/parent(\/monitor)?/)

    await page.route('**/api/tasks', async (route) => {
      if (route.request().method() !== 'GET') return route.continue()
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 701,
            title: '朗读 10 分钟',
            category: 'study',
            schedule: 'daily',
            timeSlot: 'anytime',
            targetValue: 1,
            pointsReward: 5,
            published: true,
            active: true,
            requireConfirm: false,
            assigns: [],
          },
        ]),
      })
    })

    await page.goto('/parent/tasks')
    await expect(page.getByText('朗读 10 分钟').first()).toBeVisible({
      timeout: 15_000,
    })

    const delBtn = page.getByRole('button', { name: /^删除$/ }).first()
    if (await delBtn.isVisible().catch(() => false)) {
      await delBtn.click()
    } else {
      await page.getByText('朗读 10 分钟').first().click()
      await page.getByRole('button', { name: /更多/ }).first().click()
      await page.getByRole('menuitem', { name: '删除任务' }).click()
    }

    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await expect(page.getByRole('heading', { name: '删除任务' })).toBeVisible()
    await expect(dialog.locator('.sp-msg')).toContainText(/立刻看不�?)
    await expect(dialog.getByRole('button', { name: '删除' })).toBeVisible()
    await dialog.getByRole('button', { name: '取消' }).click()
    await expect(dialog).toHaveCount(0)
  })
})
