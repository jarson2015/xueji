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

test.describe('离线打卡顶栏', () => {
  test('注入待同步队列后顶栏显示条数', async ({ page }) => {
    await loginStudent(page)
    await page.evaluate(() => {
      localStorage.setItem(
        'xueji.offlineCheckins',
        JSON.stringify([
          {
            clientId: 'e2e-offline-1',
            payload: { assignId: 1, clientId: 'e2e-offline-1', note: 'e2e' },
            createdAt: new Date().toISOString(),
            retries: 0,
          },
          {
            clientId: 'e2e-offline-2',
            payload: { assignId: 2, clientId: 'e2e-offline-2', note: 'e2e' },
            createdAt: new Date().toISOString(),
            retries: 0,
          },
        ]),
      )
    })
    await page.reload()
    await expect(page).toHaveURL(/\/student/)
    await expect(page.getByText('2 条打卡待同步')).toBeVisible({ timeout: 10_000 })
  })
})
