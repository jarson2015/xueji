import { MigrationInterface, QueryRunner } from 'typeorm';

export class AllowanceLedger1740000000007 implements MigrationInterface {
  name = 'AllowanceLedger1740000000007';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const db = queryRunner.connection.options.type;
    if (db === 'sqlite') {
      await queryRunner.query(
        `ALTER TABLE family_settings ADD COLUMN allowance_ledger_enabled boolean NOT NULL DEFAULT 0`,
      );
      await queryRunner.query(
        `ALTER TABLE family_settings ADD COLUMN allowance_weekly_cents integer`,
      );
      await queryRunner.query(
        `ALTER TABLE family_settings ADD COLUMN allowance_large_cents integer NOT NULL DEFAULT 5000`,
      );
      await queryRunner.query(
        `ALTER TABLE family_settings ADD COLUMN allowance_save_percent integer NOT NULL DEFAULT 0`,
      );
      await queryRunner.query(
        `ALTER TABLE family_settings ADD COLUMN allowance_note text`,
      );
      await queryRunner.query(`
CREATE TABLE IF NOT EXISTS allowance_accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL UNIQUE,
  balance_cents INTEGER NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
)`);
      await queryRunner.query(`
CREATE TABLE IF NOT EXISTS allowance_goals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  title VARCHAR(80) NOT NULL,
  target_cents INTEGER NOT NULL,
  saved_cents INTEGER NOT NULL DEFAULT 0,
  status VARCHAR(16) NOT NULL DEFAULT 'active',
  cover_url VARCHAR(255),
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
)`);
      await queryRunner.query(`
CREATE TABLE IF NOT EXISTS allowance_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  account_id INTEGER NOT NULL,
  delta_cents INTEGER NOT NULL,
  kind VARCHAR(24) NOT NULL,
  category VARCHAR(24),
  title VARCHAR(80) NOT NULL,
  note VARCHAR(200),
  image_url VARCHAR(255),
  status VARCHAR(16) NOT NULL DEFAULT 'posted',
  goal_id INTEGER,
  created_by INTEGER NOT NULL,
  reviewed_by INTEGER,
  review_note VARCHAR(200),
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  posted_at DATETIME
)`);
    } else {
      await queryRunner.query(`
ALTER TABLE family_settings
  ADD COLUMN allowance_ledger_enabled TINYINT NOT NULL DEFAULT 0,
  ADD COLUMN allowance_weekly_cents INT NULL,
  ADD COLUMN allowance_large_cents INT NOT NULL DEFAULT 5000,
  ADD COLUMN allowance_save_percent INT NOT NULL DEFAULT 0,
  ADD COLUMN allowance_note TEXT NULL
`);
      await queryRunner.query(`
CREATE TABLE IF NOT EXISTS allowance_accounts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL UNIQUE,
  balance_cents INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
)`);
      await queryRunner.query(`
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
)`);
      await queryRunner.query(`
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
)`);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS allowance_entries`);
    await queryRunner.query(`DROP TABLE IF EXISTS allowance_goals`);
    await queryRunner.query(`DROP TABLE IF EXISTS allowance_accounts`);
    const db = queryRunner.connection.options.type;
    if (db !== 'sqlite') {
      await queryRunner.query(`
ALTER TABLE family_settings
  DROP COLUMN allowance_note,
  DROP COLUMN allowance_save_percent,
  DROP COLUMN allowance_large_cents,
  DROP COLUMN allowance_weekly_cents,
  DROP COLUMN allowance_ledger_enabled
`);
    }
  }
}
