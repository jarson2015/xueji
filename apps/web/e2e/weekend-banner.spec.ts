import { test, expect, type Page } from '@playwright/test'

const PARENT_USER = process.env.E2E_PARENT_USER || 'parent@demo.com'
const PARENT_PASS = process.env.E2E_PARENT_PASS || 'demo1234'

async function clearSession(page: Page) {
  await page.goto('/login')
  await page.evaluate(() => {
    localStorage.clear()
    sessionStorage.clear()
    localStorage.setItem('onboardParentV2', 'done')
    localStorage.setItem('guideParentDone', '1')
  })
  await page.goto('/login')
}

async function loginAsParent(page: Page) {
  await clearSession(page)
  await page.getByRole('button', { name: '家长' }).click()
  await page.getByRole('textbox', { name: '账号' }).fill(PARENT_USER)
  await page.getByRole('textbox', { name: '密码' }).fill(PARENT_PASS)
  await page.locator('form').getByRole('button', { name: '登录' }).click()
  await expect(page).toHaveURL(/\/parent(\/monitor)?/)
}

/** 冻结本地 Date，使周五–日判定可测 */
async function freezeLocalDate(page: Page, isoLocal: string) {
  await page.addInitScript((iso) => {
    const fixed = new Date(iso).valueOf()
    const RealDate = Date
    const FakeDate: any = function (this: any, ...args: any[]) {
      if (!(this instanceof FakeDate)) {
        return args.length ? new (RealDate as any)(...args) : new RealDate(fixed)
      }
      if (args.length === 0) {
        return new RealDate(fixed)
      }
      return new (RealDate as any)(...args)
    }
    FakeDate.prototype = RealDate.prototype
    FakeDate.now = () => fixed
    FakeDate.parse = RealDate.parse
    FakeDate.UTC = RealDate.UTC
    ;(window as any).Date = FakeDate
  }, isoLocal)
}

test.describe('学迹看板周末小会横幅', () => {
  test('周五：可见横幅与开小会 / 作品集', async ({ page }) => {
    await freezeLocalDate(page, '2026-08-07T12:00:00')
    await loginAsParent(page)
    await page.goto('/parent/monitor')
    const banner = page.getByRole('region', { name: '周末小会' })
    await expect(banner).toBeVisible({ timeout: 15_000 })
    await expect(banner.getByText(/骄傲 · 改一件 · 陪伴/)).toBeVisible()
    await expect(banner.getByRole('button', { name: '开小会' })).toBeVisible()
    await expect(banner.getByRole('button', { name: '作品集' })).toBeVisible()
  })

  test('周一：不显示周末小会横幅', async ({ page }) => {
    await freezeLocalDate(page, '2026-08-03T12:00:00')
    await loginAsParent(page)
    await page.goto('/parent/monitor')
    await expect(page.locator('.page').first()).toBeVisible({ timeout: 15_000 })
    await expect(page.getByRole('region', { name: '周末小会' })).toHaveCount(0)
  })
})
