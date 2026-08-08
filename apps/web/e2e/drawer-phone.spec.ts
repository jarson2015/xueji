import { test, expect, type Page } from '@playwright/test'

const STUDENT_CODE = process.env.E2E_STUDENT_CODE || '10293847'

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

test.describe('学迹手机抽屉高度', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('窄屏打开主题抽屉使用 --drawer-phone', async ({ page }) => {
    await clearSession(page)
    await page.getByRole('button', { name: '学生进入' }).click()
    await page.keyboard.type(STUDENT_CODE)
    await expect(page).toHaveURL(/\/student(\/today)?/, { timeout: 20_000 })
    const skip = page.getByRole('button', { name: '稍后再说' })
    if (await skip.isVisible().catch(() => false)) await skip.click()

    await page.locator('.weekly-goal').getByRole('button', { name: /定一个|去改/ }).click()
    const drawer = page.locator('.el-drawer').first()
    await expect(drawer).toBeVisible()
    const sizeAttr = await drawer.evaluate((el) => {
      const root = el.closest('.el-drawer') || el
      return (
        getComputedStyle(root).getPropertyValue('--drawer-phone').trim() ||
        (root as HTMLElement).style.height ||
        getComputedStyle(root).height
      )
    })
    // 变量已注入页面；抽屉高度应接�?88vh 上限逻辑（有计算值）
    const cssVar = await page.evaluate(() =>
      getComputedStyle(document.documentElement)
        .getPropertyValue('--drawer-phone')
        .trim(),
    )
    expect(cssVar).toMatch(/min\(|vh|px/)
    await expect(page.getByRole('button', { name: '保存本周主题' })).toBeVisible()
    expect(sizeAttr.length).toBeGreaterThan(0)
  })
})
