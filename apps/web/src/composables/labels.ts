/**
 * 学迹统一文案词典 —— 导航、页标题、空状态 CTA 共用，避免「看板/今日摘要」等漂移。
 * 侧栏尽量 4 字对齐。
 */
export const labels = {
  brand: '学迹',

  // 家长
  parentMonitor: '今日看板',
  parentStudents: '学生管理',
  parentTasks: '任务清单',
  parentFamily: '更多设置',
  parentWishes: '愿望商店',
  parentReports: '学习周报',
  parentRestDays: '休息约定',
  parentFamilyEdu: '教育设置',
  parentCovenant: '家庭公约',
  parentAllowance: '零花账本',
  parentPacts: '积分约定',
  parentGrowth: '成长记录',
  parentWeekend: '周末小会',
  parentJournal: '家庭说说',

  // 学生
  studentToday: '今日待办',
  studentRewards: '愿望奖励',
  studentMore: '更多功能',
  /** 档案层：查历史/补进度，非日常打卡入口 */
  studentTasks: '任务档案',
  studentMe: '我的计划',
  studentCovenant: '家庭公约',
  studentAllowance: '零花账本',
  studentPacts: '积分约定',
  studentJournal: '家庭说说',

  // 通用
  pointsUnit: '积分',
  logoutConfirm: '确定退出登录吗？',
} as const

export type LabelKey = keyof typeof labels
