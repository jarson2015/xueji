import { test, expect, type Page } from '@playwright/test'

const PARENT_USER = process.env.E2E_PARENT_USER || 'parent@demo.com'
const PARENT_PASS = process.env.E2E_PARENT_PASS || 'demo1234'
const STUDENT_CODE = process.env.E2E_STUDENT_CODE || '10293847'

async function clearSession(page: Page, role: 'parent' | 'student') {
  await page.goto('/login')
  await page.evaluate((r) => {
    localStorage.clear()
    sessionStorage.clear()
    if (r === 'parent') {
      localStorage.setItem('onboardParentV2', 'done')
      localStorage.setItem('guideParentDone', '1')
    } else {
      localStorage.setItem('onboardStudentV2', 'done')
      localStorage.setItem('guideStudentDone', '1')
    }
  }, role)
  await page.goto('/login')
}

async function loginParent(page: Page) {
  await clearSession(page, 'parent')
  await page.getByRole('button', { name: '家长' }).click()
  await page.getByRole('textbox', { name: '账号' }).fill(PARENT_USER)
  await page.getByRole('textbox', { name: '密码' }).fill(PARENT_PASS)
  await page.locator('form').getByRole('button', { name: '登录' }).click()
  await expect(page).toHaveURL(/\/parent(\/monitor)?/, { timeout: 20_000 })
}

async function loginStudent(page: Page) {
  await clearSession(page, 'student')
  await page.getByRole('button', { name: '学生进入' }).click()
  await page.keyboard.type(STUDENT_CODE)
  await expect(page).toHaveURL(/\/student(\/today)?/, { timeout: 20_000 })
  const skip = page.getByRole('button', { name: '稍后再说' })
  if (await skip.isVisible().catch(() => false)) await skip.click()
}

test.describe('学迹家庭说说入口', () => {
  test('家长 More �?家庭说说', async ({ page }) => {
    await loginParent(page)
    await page.goto('/parent/more')
    await expect(
      page.getByRole('heading', { name: '家庭说说', exact: true }),
    ).toBeVisible({
      timeout: 15_000,
    })
    await page.getByRole('heading', { name: '家庭说说', exact: true }).click()
    await expect(page).toHaveURL(/\/parent\/journal/)
    await expect(page.locator('h2.page-title')).toHaveText('家庭说说', {
      timeout: 15_000,
    })
    await expect(page.getByText(/不计�?)).toBeVisible()
    await expect(page.getByText('我的私密日记')).toHaveCount(0)
  })

  test('学生 More �?家庭说说含私密区入口', async ({ page }) => {
    await loginStudent(page)
    await page.goto('/student/more')
    await expect(
      page.getByRole('heading', { name: '家庭说说', exact: true }),
    ).toBeVisible({
      timeout: 15_000,
    })
    await page.getByRole('heading', { name: '家庭说说', exact: true }).click()
    await expect(page).toHaveURL(/\/student\/journal/)
    await expect(page.locator('h2.page-title')).toHaveText('家庭说说', {
      timeout: 15_000,
    })
    await expect(page.getByText('我的私密日记')).toBeVisible({ timeout: 15_000 })
  })
})
