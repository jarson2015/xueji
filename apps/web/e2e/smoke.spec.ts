import { test, expect, type Page } from '@playwright/test'

const PARENT_USER = process.env.E2E_PARENT_USER || 'parent@demo.com'
const PARENT_PASS = process.env.E2E_PARENT_PASS || 'demo1234'
const STUDENT_CODE = process.env.E2E_STUDENT_CODE || '102938'

async function clearSession(page: Page) {
  await page.goto('/login')
  await page.evaluate(() => {
    localStorage.clear()
    sessionStorage.clear()
    // 跳过新手引导，避免遮罩挡住冒烟点击
    localStorage.setItem('onboardParentV2', 'done')
    localStorage.setItem('guideParentDone', '1')
    localStorage.setItem('onboardStudentV2', 'done')
    localStorage.setItem('guideStudentDone', '1')
  })
  await page.goto('/login')
  await expect(page.getByRole('heading', { name: '学迹' })).toBeVisible()
}

async function loginAsParent(page: Page) {
  await clearSession(page)
  await page.getByRole('button', { name: '家长' }).click()
  await page.getByRole('textbox', { name: '账号' }).fill(PARENT_USER)
  await page.getByRole('textbox', { name: '密码' }).fill(PARENT_PASS)
  await page.locator('form').getByRole('button', { name: '登录' }).click()
  await expect(page).toHaveURL(/\/parent(\/monitor)?/)
  await expect(page.getByRole('heading', { name: '今日看板' }).first()).toBeVisible()
}

test.describe('学迹 UI 冒烟', () => {
  test('家长账号可登录并进入今日看板', async ({ page }) => {
    await loginAsParent(page)
  })

  test('学生登录码可进入今日待办', async ({ page }) => {
    await clearSession(page)
    await page.getByRole('button', { name: '学生进入' }).click()
    await expect(page.getByRole('group', { name: '6 位登录码' })).toBeVisible()
    await page.keyboard.type(STUDENT_CODE)
    await expect(page).toHaveURL(/\/student(\/today)?/, { timeout: 20_000 })
    await expect(page.getByRole('heading', { name: '今日' }).first()).toBeVisible()
  })

  test('教育设置：常用可见，进阶项默认可折叠', async ({ page }) => {
    await loginAsParent(page)
    await page.goto('/parent/family-edu')
    await expect(page.getByRole('heading', { name: '家庭教育设置' })).toBeVisible()
    await expect(page.locator('#edu-common')).toHaveText('常用')
    await expect(page.locator('#edu-advanced')).toHaveText('进阶')
    await expect(page.getByRole('heading', { name: '积分与成长' })).toBeVisible()
    // 公约默认收起（DOM 可能仍在，以可见性为准）
    await expect(page.getByText('家庭互助卡说明（孩子可见）')).toBeHidden()
    await page.locator('.el-collapse-item__header', { hasText: '公约文案' }).click()
    await expect(page.getByText('家庭互助卡说明（孩子可见）')).toBeVisible()
    const reflection = page.getByText('打卡后反思小问')
    if (await reflection.isHidden()) {
      await page.locator('.el-collapse-item__header', { hasText: '打卡与确认' }).click()
    }
    await expect(reflection).toBeVisible()
  })

  test('家长 More：无重复日常三入口卡片', async ({ page }) => {
    await loginAsParent(page)
    await page.goto('/parent/more')
    await expect(page.getByRole('heading', { name: '更多设置' })).toBeVisible()
    await expect(page.getByText(/日常请用底部/)).toBeVisible()
    const cards = page.locator('.link-card h3')
    await expect(cards.filter({ hasText: '今日看板' })).toHaveCount(0)
    await expect(cards.filter({ hasText: '学生管理' })).toHaveCount(0)
    await expect(cards.filter({ hasText: '任务清单' })).toHaveCount(0)
  })

  test('家长 More：可见离屏提醒与开启通知', async ({ page }) => {
    await loginAsParent(page)
    await page.goto('/parent/more')
    await expect(page.getByRole('heading', { name: '离屏提醒' })).toBeVisible()
    await expect(page.getByRole('button', { name: '开启通知' })).toBeVisible()
    await expect(
      page.getByText(/待确认打卡、兑换愿望或提议小事/),
    ).toBeVisible()
  })
})
