export enum UserRole {
  PARENT = 'parent',
  STUDENT = 'student',
}

export enum TaskSchedule {
  ONCE = 'once',
  DAILY = 'daily',
  WEEKLY = 'weekly',
}

export enum TargetType {
  ONCE = 'once',
  COUNT = 'count',
  DURATION = 'duration',
}

export enum AssignStatus {
  ACTIVE = 'active',
  COMPLETED = 'completed',
  /** Expired / past deadline */
  CLOSED = 'closed',
  /** Shared task finished by a sibling — stop nudging */
  SHARED_DONE = 'shared_done',
  /** Period ended while makeup disabled — stop nudging, fresh next period */
  DAY_ARCHIVED = 'day_archived',
}

export enum ConfirmStatus {
  NONE = 'none',
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export enum RedeemStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export enum PointReason {
  CHECKIN = 'checkin',
  REDEEM = 'redeem',
  ADJUST = 'adjust',
  STREAK = 'streak',
  MAKEUP = 'makeup',
  /** Settled later when family rewardMode is weekly_digest */
  WEEKLY_DIGEST = 'weekly_digest',
  /** 积分约定：借出方扣分 */
  PACT_OUT = 'pact_out',
  /** 积分约定：借用方加分 */
  PACT_IN = 'pact_in',
  /** 积分约定：还回积分 */
  PACT_RETURN = 'pact_return',
  /** 积分约定：逾期补分 */
  PACT_OVERDUE = 'pact_overdue',
  /** 积分赠予：赠出方扣分 */
  GIFT_OUT = 'gift_out',
  /** 积分赠予：接收方加分 */
  GIFT_IN = 'gift_in',
}

/** 兄妹积分约定状态 */
export enum PointPactStatus {
  /** 大额：待家长先同意 */
  PARENT_PENDING = 'parent_pending',
  PENDING = 'pending',
  ACTIVE = 'active',
  REPAID = 'repaid',
  CANCELLED = 'cancelled',
  WRITTEN_OFF = 'written_off',
}

/** 兄妹积分赠予状态（与约定隔离） */
export enum PointGiftStatus {
  PARENT_PENDING = 'parent_pending',
  PENDING = 'pending',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

/** 赠予心意原因 */
export enum PointGiftReason {
  CHEER = 'cheer',
  WISH_HELP = 'wish_help',
  THANKS = 'thanks',
  OTHER = 'other',
}

export enum TaskCategory {
  STUDY = 'study',
  CHORE = 'chore',
  ROUTINE = 'routine',
}

export enum TimeSlot {
  AFTER_WAKE = 'after_wake',
  BEFORE_SCHOOL = 'before_school',
  AFTER_BREAKFAST = 'after_breakfast',
  AFTER_LUNCH = 'after_lunch',
  AFTER_SCHOOL = 'after_school',
  AFTER_DINNER = 'after_dinner',
  BEDTIME = 'bedtime',
  ANYTIME = 'anytime',
}

/** Wish shop item type — golden_finger uses normal points, waives one chore on approve */
export enum WishType {
  NORMAL = 'normal',
  GOLDEN_FINGER = 'golden_finger',
}

/** Wish reward kind — guides values beyond physical goods */
export enum WishKind {
  ITEM = 'item',
  EXPERIENCE = 'experience',
  COMPANY = 'company',
  CHOICE = 'choice',
}

/** Allowance ledger — isolated from study points */
export enum AllowanceKind {
  POCKET_MONEY = 'pocket_money',
  BONUS = 'bonus',
  GIFT_IN = 'gift_in',
  SPEND = 'spend',
  SAVE = 'save',
  UNSAVE = 'unsave',
  ADJUST = 'adjust',
}

export enum AllowanceCategory {
  SNACK = 'snack',
  STATIONERY = 'stationery',
  PLAY = 'play',
  GIFT = 'gift',
  TRANSPORT = 'transport',
  SAVE = 'save',
  OTHER = 'other',
}

export enum AllowanceEntryStatus {
  POSTED = 'posted',
  PENDING = 'pending',
  REJECTED = 'rejected',
}

export enum AllowanceGoalStatus {
  ACTIVE = 'active',
  ACHIEVED = 'achieved',
  CANCELLED = 'cancelled',
}
