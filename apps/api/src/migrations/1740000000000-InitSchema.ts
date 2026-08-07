import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Baseline MySQL/SQLite schema (IF NOT EXISTS).
 * Used when DB_SYNCHRONIZE=false and DB_MIGRATIONS_RUN=true.
 */
export class InitSchema1740000000000 implements MigrationInterface {
  name = 'InitSchema1740000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const db = queryRunner.connection.options.type;
    if (db === 'sqlite') {
      await this.upSqlite(queryRunner);
      return;
    }
    await this.upMysql(queryRunner);
  }

  private async upMysql(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    await queryRunner.query(`
CREATE TABLE IF NOT EXISTS parent_students (
  id INT NOT NULL AUTO_INCREMENT,
  parent_id INT NOT NULL,
  student_id INT NOT NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  UNIQUE INDEX IDX_parent_student (parent_id, student_id),
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    await queryRunner.query(`
CREATE TABLE IF NOT EXISTS family_settings (
  id INT NOT NULL AUTO_INCREMENT,
  parent_id INT NOT NULL,
  weekly_rest_days TEXT NULL,
  extra_rest_dates TEXT NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  UNIQUE INDEX IDX_family_settings_parent (parent_id),
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    await queryRunner.query(`
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    await queryRunner.query(`
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    await queryRunner.query(`
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    await queryRunner.query(`
CREATE TABLE IF NOT EXISTS task_steps (
  id INT NOT NULL AUTO_INCREMENT,
  task_id INT NOT NULL,
  title VARCHAR(200) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    await queryRunner.query(`
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    await queryRunner.query(`
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
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    await queryRunner.query(`
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    await queryRunner.query(`
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    await queryRunner.query(`
CREATE TABLE IF NOT EXISTS point_ledgers (
  id INT NOT NULL AUTO_INCREMENT,
  student_id INT NOT NULL,
  delta INT NOT NULL,
  reason VARCHAR(20) NOT NULL,
  ref_id INT NULL,
  note VARCHAR(200) NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    await queryRunner.query(`
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    await queryRunner.query(`
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  }

  private async upSqlite(queryRunner: QueryRunner): Promise<void> {
    // Local sqlite usually uses synchronize; keep no-op to avoid fighting sync.
    void queryRunner;
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const db = queryRunner.connection.options.type;
    if (db === 'sqlite') return;
    await queryRunner.query(`DROP TABLE IF EXISTS wish_redeems`);
    await queryRunner.query(`DROP TABLE IF EXISTS wish_items`);
    await queryRunner.query(`DROP TABLE IF EXISTS point_ledgers`);
    await queryRunner.query(`DROP TABLE IF EXISTS plan_items`);
    await queryRunner.query(`DROP TABLE IF EXISTS study_plans`);
    await queryRunner.query(`DROP TABLE IF EXISTS checkins`);
    await queryRunner.query(`DROP TABLE IF EXISTS task_assigns`);
    await queryRunner.query(`DROP TABLE IF EXISTS task_steps`);
    await queryRunner.query(`DROP TABLE IF EXISTS tasks`);
    await queryRunner.query(`DROP TABLE IF EXISTS push_subscriptions`);
    await queryRunner.query(`DROP TABLE IF EXISTS family_invites`);
    await queryRunner.query(`DROP TABLE IF EXISTS family_settings`);
    await queryRunner.query(`DROP TABLE IF EXISTS parent_students`);
    await queryRunner.query(`DROP TABLE IF EXISTS users`);
  }
}
