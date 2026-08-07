import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('family_settings')
export class FamilySettings {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'parent_id', unique: true })
  parentId: number;

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'parent_id' })
  parent: User;

  /** Weekly rest weekdays: 0=Sun … 6=Sat (Shanghai calendar) */
  @Column({ name: 'weekly_rest_days', type: 'simple-json', nullable: true })
  weeklyRestDays: number[] | null;

  /** Extra rest dates YYYY-MM-DD */
  @Column({ name: 'extra_rest_dates', type: 'simple-json', nullable: true })
  extraRestDates: string[] | null;

  /** Master switch for rest-day policy (default off) */
  @Column({ name: 'rest_days_enabled', type: 'boolean', default: false })
  restDaysEnabled: boolean;

  /** On rest day, hide all tasks including once */
  @Column({ name: 'rest_pause_all', type: 'boolean', default: false })
  restPauseAll: boolean;

  /** Categories to pause on rest day when not pause-all: study/chore/routine */
  @Column({ name: 'rest_pause_categories', type: 'simple-json', nullable: true })
  restPauseCategories: string[] | null;

  /** Allow makeup checkins after expiry / missed period */
  @Column({ name: 'makeup_enabled', type: 'boolean', default: true })
  makeupEnabled: boolean;

  /** Makeup awards this % of pointsReward (default 50) */
  @Column({ name: 'makeup_discount_percent', type: 'int', default: 50 })
  makeupDiscountPercent: number;

  /** How many days back makeup is allowed for daily/weekly */
  @Column({ name: 'makeup_window_days', type: 'int', default: 7 })
  makeupWindowDays: number;

  /** always | random | weekly_digest — reward fade strategy */
  @Column({ name: 'reward_mode', type: 'varchar', length: 24, default: 'random' })
  rewardMode: string;

  /** 纯内驱力模式：学生端弱化积分展示，庆祝偏过程 */
  @Column({ name: 'intrinsic_mode', type: 'boolean', default: false })
  intrinsicMode: boolean;

  /** young | general | teen */
  @Column({ name: 'age_band', type: 'varchar', length: 16, default: 'general' })
  ageBand: string;

  /** Offer optional reflection prompt after checkin */
  @Column({ name: 'reflection_enabled', type: 'boolean', default: true })
  reflectionEnabled: boolean;

  /** Plain-language note about golden finger for covenant page */
  @Column({ name: 'golden_finger_note', type: 'text', nullable: true })
  goldenFingerNote: string | null;

  /** Free-text family covenant / house rules */
  @Column({ name: 'covenant_note', type: 'text', nullable: true })
  covenantNote: string | null;

  /** Show allowance ledger feature (default off) */
  @Column({ name: 'allowance_ledger_enabled', type: 'boolean', default: false })
  allowanceLedgerEnabled: boolean;

  /** Suggested weekly pocket money in cents (display only) */
  @Column({ name: 'allowance_weekly_cents', type: 'int', nullable: true })
  allowanceWeeklyCents: number | null;

  /** Spend >= this (cents) needs parent confirm; default ¥50 */
  @Column({ name: 'allowance_large_cents', type: 'int', default: 5000 })
  allowanceLargeCents: number;

  /** Suggested save-first percent 0–50 */
  @Column({ name: 'allowance_save_percent', type: 'int', default: 0 })
  allowanceSavePercent: number;

  @Column({ name: 'allowance_note', type: 'text', nullable: true })
  allowanceNote: string | null;

  /** 兄妹积分约定（默认关；积分不是钱） */
  @Column({ name: 'points_pact_enabled', type: 'boolean', default: false })
  pointsPactEnabled: boolean;

  /** 单笔最多借用积分数 */
  @Column({ name: 'points_pact_max_amount', type: 'int', default: 50 })
  pointsPactMaxAmount: number;

  /** 每人未结清约定上限（作为借出或借用） */
  @Column({ name: 'points_pact_max_active', type: 'int', default: 3 })
  pointsPactMaxActive: number;

  /** 逾期补分上限（每天 1 分） */
  @Column({ name: 'points_pact_max_overdue_extra', type: 'int', default: 30 })
  pointsPactMaxOverdueExtra: number;

  @Column({ name: 'points_pact_note', type: 'text', nullable: true })
  pointsPactNote: string | null;

  /**
   * 单笔达到该积分数需家长先同意；0 = 不启用家长闸。
   * 默认 20。
   */
  @Column({ name: 'points_pact_parent_approve_above', type: 'int', default: 20 })
  pointsPactParentApproveAbove: number;

  /** 赠予单笔上限（默认 20） */
  @Column({ name: 'points_gift_max_amount', type: 'int', default: 20 })
  pointsGiftMaxAmount: number;

  /** 赠予达该分需家长先同意；0 = 关（默认 10） */
  @Column({ name: 'points_gift_parent_approve_above', type: 'int', default: 10 })
  pointsGiftParentApproveAbove: number;

  /** 每人每天最多发起赠予笔数 */
  @Column({ name: 'points_gift_daily_max', type: 'int', default: 1 })
  pointsGiftDailyMax: number;

  /** 每人每周净送出上限（已完成累计） */
  @Column({ name: 'points_gift_weekly_out_max', type: 'int', default: 40 })
  pointsGiftWeeklyOutMax: number;

  /** Max tasks a student may defer per Shanghai calendar day (0 = off) */
  @Column({ name: 'daily_skip_limit', type: 'int', default: 1 })
  dailySkipLimit: number;

  /**
   * 每晚自动通过待确认（不含补上进度）；默认关。
   * 到点由调度按 Asia/Shanghai 扫描触发。
   */
  @Column({ name: 'auto_confirm_pending_enabled', type: 'boolean', default: false })
  autoConfirmPendingEnabled: boolean;

  /** HH:mm（上海时区），默认 23:30 */
  @Column({
    name: 'auto_confirm_pending_time',
    type: 'varchar',
    length: 5,
    default: '23:30',
  })
  autoConfirmPendingTime: string;

  /** 上次成功跑批的上海日历日 YYYY-MM-DD（幂等） */
  @Column({
    name: 'auto_confirm_pending_last_run_date',
    type: 'varchar',
    length: 10,
    nullable: true,
  })
  autoConfirmPendingLastRunDate: string | null;

  /** 时段扩展档：上学前 / 早餐后 / 午餐后（默认关） */
  @Column({ name: 'slot_extended_enabled', type: 'boolean', default: false })
  slotExtendedEnabled: boolean;

  /**
   * 时钟→时段映射覆盖（整点 [start,end)，睡前可跨夜）。
   * 形如 { after_school: { startHour: 14, endHour: 18 }, ... }
   */
  @Column({ name: 'slot_clock_map', type: 'simple-json', nullable: true })
  slotClockMap: Record<string, { startHour: number; endHour: number }> | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
