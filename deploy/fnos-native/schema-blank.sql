-- 学迹 · 空白库结构（MySQL 8 / utf8mb4）
-- 用途：库已建好、无业务数据时，在飞牛 phpMyAdmin / MySQL 客户端手动导入
-- 注意：不要对已有数据的库执行本文件（会建表；若表已存在则跳过）
--
-- 导入前请先选中目标库，例如：study_checkin
-- USE study_checkin;

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ---------------------------------------------------------------------------
-- 业务表（最终结构，已合并全部迁移）
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS users (
  id INT NOT NULL AUTO_INCREMENT,
  username VARCHAR(120) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(80) NOT NULL,
  role VARCHAR(20) NOT NULL,
  points_balance INT NOT NULL DEFAULT 0,
  login_code VARCHAR(6) NULL,
  login_code_expires_at DATETIME NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  UNIQUE INDEX IDX_users_username (username),
  UNIQUE INDEX IDX_users_login_code (login_code),
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS parent_students (
  id INT NOT NULL AUTO_INCREMENT,
  parent_id INT NOT NULL,
  student_id INT NOT NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  UNIQUE INDEX IDX_parent_student (parent_id, student_id),
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS family_settings (
  id INT NOT NULL AUTO_INCREMENT,
  parent_id INT NOT NULL,
  weekly_rest_days TEXT NULL,
  extra_rest_dates TEXT NULL,
  makeup_enabled TINYINT NOT NULL DEFAULT 1,
  makeup_discount_percent INT NOT NULL DEFAULT 60,
  makeup_window_days INT NOT NULL DEFAULT 7,
  reward_mode VARCHAR(24) NOT NULL DEFAULT 'always',
  age_band VARCHAR(16) NOT NULL DEFAULT 'general',
  reflection_enabled TINYINT NOT NULL DEFAULT 1,
  golden_finger_note TEXT NULL,
  covenant_note TEXT NULL,
  allowance_ledger_enabled TINYINT NOT NULL DEFAULT 0,
  allowance_weekly_cents INT NULL,
  allowance_large_cents INT NOT NULL DEFAULT 5000,
  allowance_save_percent INT NOT NULL DEFAULT 0,
  allowance_note TEXT NULL,
  points_pact_enabled TINYINT NOT NULL DEFAULT 0,
  points_pact_max_amount INT NOT NULL DEFAULT 50,
  points_pact_max_active INT NOT NULL DEFAULT 3,
  points_pact_max_overdue_extra INT NOT NULL DEFAULT 30,
  points_pact_note TEXT NULL,
  points_pact_parent_approve_above INT NOT NULL DEFAULT 20,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  UNIQUE INDEX IDX_family_settings_parent (parent_id),
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS family_invites (
  id INT NOT NULL AUTO_INCREMENT,
  from_parent_id INT NOT NULL,
  code VARCHAR(8) NOT NULL,
  expires_at DATETIME NOT NULL,
  accepted_by_parent_id INT NULL,
  accepted_at DATETIME NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  UNIQUE INDEX IDX_family_invites_code (code),
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id INT NOT NULL AUTO_INCREMENT,
  user_id INT NOT NULL,
  endpoint TEXT NOT NULL,
  p256dh VARCHAR(255) NOT NULL,
  auth VARCHAR(255) NOT NULL,
  user_agent VARCHAR(255) NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  UNIQUE INDEX UQ_push_endpoint (endpoint(255)),
  INDEX IDX_push_user (user_id),
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS tasks (
  id INT NOT NULL AUTO_INCREMENT,
  title VARCHAR(120) NOT NULL,
  description TEXT NULL,
  creator_id INT NOT NULL,
  schedule VARCHAR(20) NOT NULL DEFAULT 'once',
  target_type VARCHAR(20) NOT NULL DEFAULT 'once',
  target_value INT NOT NULL DEFAULT 1,
  category VARCHAR(20) NOT NULL DEFAULT 'study',
  time_slot VARCHAR(20) NOT NULL DEFAULT 'anytime',
  deadline DATETIME NULL,
  require_confirm TINYINT NOT NULL DEFAULT 0,
  points_reward INT NOT NULL DEFAULT 10,
  active TINYINT NOT NULL DEFAULT 1,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS task_steps (
  id INT NOT NULL AUTO_INCREMENT,
  task_id INT NOT NULL,
  title VARCHAR(200) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS task_assigns (
  id INT NOT NULL AUTO_INCREMENT,
  task_id INT NOT NULL,
  student_id INT NOT NULL,
  progress_value FLOAT NOT NULL DEFAULT 0,
  progress_percent FLOAT NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  period_key VARCHAR(32) NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  UNIQUE INDEX IDX_task_student (task_id, student_id),
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS checkins (
  id INT NOT NULL AUTO_INCREMENT,
  student_id INT NOT NULL,
  task_id INT NULL,
  assign_id INT NULL,
  plan_item_id INT NULL,
  value FLOAT NOT NULL DEFAULT 1,
  note TEXT NULL,
  image_url VARCHAR(500) NULL,
  confirm_status VARCHAR(20) NOT NULL DEFAULT 'none',
  completed_step_ids TEXT NULL,
  parent_liked TINYINT NOT NULL DEFAULT 0,
  parent_comment VARCHAR(200) NULL,
  is_makeup TINYINT NOT NULL DEFAULT 0,
  makeup_period_key VARCHAR(32) NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS study_plans (
  id INT NOT NULL AUTO_INCREMENT,
  student_id INT NOT NULL,
  title VARCHAR(120) NOT NULL,
  start_date DATE NULL,
  end_date DATE NULL,
  note TEXT NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS plan_items (
  id INT NOT NULL AUTO_INCREMENT,
  plan_id INT NOT NULL,
  task_id INT NULL,
  custom_title VARCHAR(120) NULL,
  planned_date DATE NULL,
  done TINYINT NOT NULL DEFAULT 0,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS point_ledgers (
  id INT NOT NULL AUTO_INCREMENT,
  student_id INT NOT NULL,
  delta INT NOT NULL,
  reason VARCHAR(32) NOT NULL,
  ref_id INT NULL,
  note VARCHAR(200) NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS wish_items (
  id INT NOT NULL AUTO_INCREMENT,
  student_id INT NOT NULL,
  parent_id INT NOT NULL,
  title VARCHAR(120) NOT NULL,
  cost_points INT NOT NULL,
  type VARCHAR(20) NOT NULL DEFAULT 'normal',
  active TINYINT NOT NULL DEFAULT 1,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS wish_redeems (
  id INT NOT NULL AUTO_INCREMENT,
  wish_id INT NOT NULL,
  student_id INT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  cost_points INT NOT NULL DEFAULT 0,
  effect_type VARCHAR(32) NULL,
  effect_assign_id INT NULL,
  effect_title VARCHAR(120) NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS audit_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  actor_id INT NOT NULL,
  actor_name VARCHAR(64) NULL,
  action VARCHAR(64) NOT NULL,
  target_type VARCHAR(32) NULL,
  target_id INT NULL,
  student_id INT NULL,
  detail JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_audit_actor (actor_id),
  INDEX idx_audit_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS allowance_accounts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL UNIQUE,
  balance_cents INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS allowance_goals (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL,
  title VARCHAR(80) NOT NULL,
  target_cents INT NOT NULL,
  saved_cents INT NOT NULL DEFAULT 0,
  status VARCHAR(16) NOT NULL DEFAULT 'active',
  cover_url VARCHAR(255) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_allowance_goals_student (student_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS allowance_entries (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL,
  account_id INT NOT NULL,
  delta_cents INT NOT NULL,
  kind VARCHAR(24) NOT NULL,
  category VARCHAR(24) NULL,
  title VARCHAR(80) NOT NULL,
  note VARCHAR(200) NULL,
  image_url VARCHAR(255) NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'posted',
  goal_id INT NULL,
  created_by INT NOT NULL,
  reviewed_by INT NULL,
  review_note VARCHAR(200) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  posted_at DATETIME NULL,
  INDEX idx_allowance_entries_student (student_id),
  INDEX idx_allowance_entries_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS point_pacts (
  id INT NOT NULL AUTO_INCREMENT,
  lender_id INT NOT NULL,
  borrower_id INT NOT NULL,
  amount_points INT NOT NULL,
  due_date VARCHAR(10) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  overdue_extra_accrued INT NOT NULL DEFAULT 0,
  overdue_extra_paid INT NOT NULL DEFAULT 0,
  last_accrual_date VARCHAR(10) NULL,
  note VARCHAR(120) NULL,
  confirmed_at DATETIME NULL,
  repaid_at DATETIME NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  INDEX idx_point_pacts_lender (lender_id),
  INDEX idx_point_pacts_borrower (borrower_id),
  INDEX idx_point_pacts_status (status),
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------------
-- TypeORM 迁移记录（标记为已执行，避免启动后再跑 ALTER 报错）
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS migrations (
  id INT NOT NULL AUTO_INCREMENT,
  timestamp BIGINT NOT NULL,
  name VARCHAR(255) NOT NULL,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT IGNORE INTO migrations (id, timestamp, name) VALUES
  (1, 1740000000000, 'InitSchema1740000000000'),
  (2, 1740000000001, 'FamilyInvites1740000000001'),
  (3, 1740000000002, 'PushSubscriptions1740000000002'),
  (4, 1740000000003, 'PraiseAndGoldenFinger1740000000003'),
  (5, 1740000000004, 'TaskExpiryMakeup1740000000004'),
  (6, 1740000000005, 'FamilyCovenantEdu1740000000005'),
  (7, 1740000000006, 'AuditLogs1740000000006'),
  (8, 1740000000007, 'AllowanceLedger1740000000007'),
  (9, 1740000000008, 'PointsPact1740000000008'),
  (10, 1740000000009, 'PointsPactParentGate1740000000009');

SET FOREIGN_KEY_CHECKS = 1;

-- 导入成功后应看到约 20 张表（含 migrations），业务表均为空。
