import { test, expect, type Page } from '@playwright/test'

const PARENT_USER = process.env.E2E_PARENT_USER || 'parent@demo.com'
const PARENT_PASS = process.env.E2E_PARENT_PASS || 'demo1234'
const STUDENT_CODE = process.env.E2E_STUDENT_CODE || '102938'

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

test.describe('学迹作品集主题周过滤', () => {
  test('家长作品集 Tab：统计行可见；有主题史时可按周筛选', async ({ page }) => {
    await clearSession(page)
    await page.getByRole('button', { name: '家长' }).click()
    await page.getByRole('textbox', { name: '账号' }).fill(PARENT_USER)
    await page.getByRole('textbox', { name: '密码' }).fill(PARENT_PASS)
    await page.locator('form').getByRole('button', { name: '登录' }).click()
    await expect(page).toHaveURL(/\/parent(\/monitor)?/)

    await page.goto('/parent/growth?tab=portfolio')
    await expect(page.getByRole('tab', { name: '作品集' })).toBeVisible({
      timeout: 15_000,
    })
    await expect(page.locator('.portfolio-stats')).toBeVisible()
    await expect(page.getByText(/照片\s*\d+/)).toBeVisible()

    const filterTitle = page.getByRole('heading', { name: '按主题周看' })
    if (await filterTitle.isVisible().catch(() => false)) {
      await expect(page.getByRole('button', { name: '全部' })).toBeVisible()
      const weekChip = page.locator('.theme-filter .theme-chip').nth(1)
      if (await weekChip.isVisible().catch(() => false)) {
        await weekChip.click()
        await expect(page.locator('.theme-filter .theme-chip.on').first()).toBeVisible()
        await page.getByRole('button', { name: '全部' }).click()
      }
    } else {
      await expect(
        page.getByText(/作品集还是空的|照片\s*0/),
      ).toBeVisible()
    }
  })

  test('学生作品集入口可打开', async ({ page }) => {
    await clearSession(page)
    await page.getByRole('button', { name: '学生进入' }).click()
    await page.keyboard.type(STUDENT_CODE)
    await expect(page).toHaveURL(/\/student(\/today)?/, { timeout: 20_000 })
    const skip = page.getByRole('button', { name: '稍后再说' })
    if (await skip.isVisible().catch(() => false)) await skip.click()

    await page.goto('/student/growth?tab=portfolio')
    await expect(page.getByRole('tab', { name: '作品集' })).toBeVisible({
      timeout: 15_000,
    })
    await expect(page.locator('.portfolio-stats')).toBeVisible()
  })
})
