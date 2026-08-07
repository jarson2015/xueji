import { MigrationInterface, QueryRunner } from 'typeorm';

export class PointsPact1740000000008 implements MigrationInterface {
  name = 'PointsPact1740000000008';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const db = queryRunner.connection.options.type;
    if (db === 'sqlite') {
      await queryRunner.query(
        `ALTER TABLE family_settings ADD COLUMN points_pact_enabled boolean NOT NULL DEFAULT 0`,
      );
      await queryRunner.query(
        `ALTER TABLE family_settings ADD COLUMN points_pact_max_amount integer NOT NULL DEFAULT 50`,
      );
      await queryRunner.query(
        `ALTER TABLE family_settings ADD COLUMN points_pact_max_active integer NOT NULL DEFAULT 3`,
      );
      await queryRunner.query(
        `ALTER TABLE family_settings ADD COLUMN points_pact_max_overdue_extra integer NOT NULL DEFAULT 30`,
      );
      await queryRunner.query(
        `ALTER TABLE family_settings ADD COLUMN points_pact_note text`,
      );
      await queryRunner.query(`
CREATE TABLE IF NOT EXISTS point_pacts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lender_id INTEGER NOT NULL,
  borrower_id INTEGER NOT NULL,
  amount_points INTEGER NOT NULL,
  due_date VARCHAR(10) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  overdue_extra_accrued INTEGER NOT NULL DEFAULT 0,
  overdue_extra_paid INTEGER NOT NULL DEFAULT 0,
  last_accrual_date VARCHAR(10),
  note VARCHAR(120),
  confirmed_at DATETIME,
  repaid_at DATETIME,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
)`);
    } else {
      await queryRunner.query(`
ALTER TABLE family_settings
  ADD COLUMN points_pact_enabled TINYINT NOT NULL DEFAULT 0,
  ADD COLUMN points_pact_max_amount INT NOT NULL DEFAULT 50,
  ADD COLUMN points_pact_max_active INT NOT NULL DEFAULT 3,
  ADD COLUMN points_pact_max_overdue_extra INT NOT NULL DEFAULT 30,
  ADD COLUMN points_pact_note TEXT NULL
`);
      await queryRunner.query(`
CREATE TABLE IF NOT EXISTS point_pacts (
  id INT AUTO_INCREMENT PRIMARY KEY,
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
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_point_pacts_lender (lender_id),
  INDEX idx_point_pacts_borrower (borrower_id),
  INDEX idx_point_pacts_status (status)
)`);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS point_pacts`);
    const db = queryRunner.connection.options.type;
    if (db === 'sqlite') {
      // SQLite cannot drop columns easily; leave settings columns
    } else {
      await queryRunner.query(`
ALTER TABLE family_settings
  DROP COLUMN points_pact_enabled,
  DROP COLUMN points_pact_max_amount,
  DROP COLUMN points_pact_max_active,
  DROP COLUMN points_pact_max_overdue_extra,
  DROP COLUMN points_pact_note
`);
    }
  }
}
