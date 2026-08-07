import { MigrationInterface, QueryRunner } from 'typeorm';

/** 积分赠予：point_gifts + family_settings 限额默认 20/10/1/40 */
export class PointsGift1740000000020 implements MigrationInterface {
  name = 'PointsGift1740000000020';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const db = queryRunner.connection.options.type;
    if (db === 'sqlite') {
      await queryRunner.query(
        `ALTER TABLE family_settings ADD COLUMN points_gift_max_amount integer NOT NULL DEFAULT 20`,
      );
      await queryRunner.query(
        `ALTER TABLE family_settings ADD COLUMN points_gift_parent_approve_above integer NOT NULL DEFAULT 10`,
      );
      await queryRunner.query(
        `ALTER TABLE family_settings ADD COLUMN points_gift_daily_max integer NOT NULL DEFAULT 1`,
      );
      await queryRunner.query(
        `ALTER TABLE family_settings ADD COLUMN points_gift_weekly_out_max integer NOT NULL DEFAULT 40`,
      );
      await queryRunner.query(`
CREATE TABLE IF NOT EXISTS point_gifts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  from_student_id INTEGER NOT NULL,
  to_student_id INTEGER NOT NULL,
  amount_points INTEGER NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  reason_code VARCHAR(20) NOT NULL,
  note VARCHAR(120),
  parent_decided_at DATETIME,
  accepted_at DATETIME,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
)`);
    } else {
      await queryRunner.query(`
ALTER TABLE family_settings
  ADD COLUMN points_gift_max_amount INT NOT NULL DEFAULT 20,
  ADD COLUMN points_gift_parent_approve_above INT NOT NULL DEFAULT 10,
  ADD COLUMN points_gift_daily_max INT NOT NULL DEFAULT 1,
  ADD COLUMN points_gift_weekly_out_max INT NOT NULL DEFAULT 40
`);
      await queryRunner.query(`
CREATE TABLE IF NOT EXISTS point_gifts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  from_student_id INT NOT NULL,
  to_student_id INT NOT NULL,
  amount_points INT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  reason_code VARCHAR(20) NOT NULL,
  note VARCHAR(120) NULL,
  parent_decided_at DATETIME NULL,
  accepted_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_point_gifts_from (from_student_id),
  INDEX idx_point_gifts_to (to_student_id),
  INDEX idx_point_gifts_status (status)
)`);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS point_gifts`);
    const db = queryRunner.connection.options.type;
    if (db === 'sqlite') return;
    await queryRunner.query(`
ALTER TABLE family_settings
  DROP COLUMN points_gift_max_amount,
  DROP COLUMN points_gift_parent_approve_above,
  DROP COLUMN points_gift_daily_max,
  DROP COLUMN points_gift_weekly_out_max
`);
  }
}
