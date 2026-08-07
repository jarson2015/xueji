/**
 * 家庭设置双页（RestDays / FamilyEdu）共用的 GET→PUT 映射。
 *
 * 两页都整页 GET `/family/settings`，但各自只编辑一部分字段。
 * 保存时用 `{ ...settingsSnapshot, ...本页 patch }` merge，避免另一页未展示的字段
 * 被表单默认值覆盖写回。
 *
 * `settingsToPutPayload` 把 GET 响应整理成与 RestDaysView 原 `save` PUT 对象一致的字段
 *（含 allowance 以分为单位，与库内/API 一致，不做元角转换——元角仅在教育页表单展示层处理）。
 */
export function settingsToPutPayload(res: any): Record<string, any> {
  return {
    weeklyRestDays: res?.weeklyRestDays || [],
    extraRestDates: res?.extraRestDates || [],
    restDaysEnabled: !!res?.restDaysEnabled,
    restPauseAll: !!res?.restPauseAll,
    restPauseCategories: res?.restPauseCategories?.length
      ? [...res.restPauseCategories]
      : ['study'],
    makeupEnabled: res?.makeupEnabled !== false,
    makeupDiscountPercent: res?.makeupDiscountPercent ?? 50,
    makeupWindowDays: res?.makeupWindowDays ?? 7,
    rewardMode: res?.rewardMode || 'always',
    intrinsicMode: !!res?.intrinsicMode,
    ageBand: res?.ageBand || 'general',
    reflectionEnabled: res?.reflectionEnabled !== false,
    dailySkipLimit: res?.dailySkipLimit ?? 1,
    autoConfirmPendingEnabled: !!res?.autoConfirmPendingEnabled,
    autoConfirmPendingTime: res?.autoConfirmPendingTime || '23:30',
    goldenFingerNote: res?.goldenFingerNote || '',
    covenantNote: res?.covenantNote || '',
    allowanceLedgerEnabled: !!res?.allowanceLedgerEnabled,
    allowanceWeeklyCents:
      res?.allowanceWeeklyCents != null ? res.allowanceWeeklyCents : null,
    allowanceLargeCents: res?.allowanceLargeCents ?? 5000,
    allowanceSavePercent: res?.allowanceSavePercent ?? 0,
    allowanceNote: res?.allowanceNote || '',
    pointsPactEnabled: !!res?.pointsPactEnabled,
    pointsPactMaxAmount: res?.pointsPactMaxAmount ?? 50,
    pointsPactMaxActive: res?.pointsPactMaxActive ?? 3,
    pointsPactMaxOverdueExtra: res?.pointsPactMaxOverdueExtra ?? 30,
    pointsPactParentApproveAbove: res?.pointsPactParentApproveAbove ?? 20,
    pointsPactNote: res?.pointsPactNote || '',
    pointsGiftMaxAmount: res?.pointsGiftMaxAmount ?? 20,
    pointsGiftParentApproveAbove: res?.pointsGiftParentApproveAbove ?? 10,
    pointsGiftDailyMax: res?.pointsGiftDailyMax ?? 1,
    pointsGiftWeeklyOutMax: res?.pointsGiftWeeklyOutMax ?? 40,
    slotExtendedEnabled: !!res?.slotExtendedEnabled,
    slotClockMap: res?.slotClockMap || res?.slotClockEffective || undefined,
  }
}
