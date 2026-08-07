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

test.describe('学迹学生兑换 SoftPrompt', () => {
  test('愿望页：近端兑 / SoftPrompt / 签收条控件', async ({ page }) => {
    await clearSession(page)
    await page.getByRole('button', { name: '学生进入' }).click()
    await page.keyboard.type(STUDENT_CODE)
    await expect(page).toHaveURL(/\/student(\/today)?/, { timeout: 20_000 })
    const skip = page.getByRole('button', { name: '稍后再说' })
    if (await skip.isVisible().catch(() => false)) await skip.click()

    await page.goto('/student/rewards')
    await expect(page.getByRole('heading', { name: '愿望奖励' })).toBeVisible({
      timeout: 15_000,
    })

    const nearRedeem = page.locator('.near-term-block .tap-btn').filter({
      hasText: /兑愿望|再攒一点|等待中/,
    })
    if (await nearRedeem.count()) {
      await expect(nearRedeem.first()).toBeVisible()
    }

    const redeemBtn = page
      .locator('button.tap-btn')
      .filter({ hasText: '兑愿望' })
      .first()
    if (await redeemBtn.isVisible().catch(() => false)) {
      await redeemBtn.click()
      const dialog = page.getByRole('dialog')
      await expect(dialog).toBeVisible()
      await expect(
        page.getByRole('heading', {
          name: /确认兑换|积分约定提醒|家庭互助卡/,
        }),
      ).toBeVisible()
      await expect(dialog.locator('.sp-msg')).toBeVisible()
      await expect(
        dialog.getByRole('button', {
          name: /提交并交由家长保管|仍要兑换/,
        }),
      ).toBeVisible()
      await dialog.getByRole('button', { name: /再想想|先留着还回/ }).click()
      await expect(dialog).toHaveCount(0)
    } else {
      await expect(
        page.getByText(/愿望商店|慢慢攒|先兑这些|还没有愿望/),
      ).toBeVisible()
    }

    const ack = page.locator('.ack-strip').first()
    if (await ack.isVisible().catch(() => false)) {
      await expect(ack.getByText(/已兑现/).first()).toBeVisible()
      await expect(
        ack.locator('button.tap-btn').filter({ hasText: '我收到了' }).first(),
      ).toBeVisible()
    } else {
      test.info().annotations.push({ type: 'note', description: '无待签收' })
    }
  })
})
