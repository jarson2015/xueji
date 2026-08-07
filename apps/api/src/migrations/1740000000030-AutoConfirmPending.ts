import { MigrationInterface, QueryRunner } from 'typeorm';

export class AutoConfirmPending1740000000030 implements MigrationInterface {
  name = 'AutoConfirmPending1740000000030';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const db = queryRunner.connection.options.type;
    if (db === 'sqlite') {
      await queryRunner.query(
        `ALTER TABLE family_settings ADD COLUMN auto_confirm_pending_enabled boolean NOT NULL DEFAULT 0`,
      );
      await queryRunner.query(
        `ALTER TABLE family_settings ADD COLUMN auto_confirm_pending_time varchar(5) NOT NULL DEFAULT '23:30'`,
      );
      await queryRunner.query(
        `ALTER TABLE family_settings ADD COLUMN auto_confirm_pending_last_run_date varchar(10) NULL`,
      );
      return;
    }
    await queryRunner.query(`
ALTER TABLE family_settings
  ADD COLUMN auto_confirm_pending_enabled TINYINT(1) NOT NULL DEFAULT 0,
  ADD COLUMN auto_confirm_pending_time VARCHAR(5) NOT NULL DEFAULT '23:30',
  ADD COLUMN auto_confirm_pending_last_run_date VARCHAR(10) NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const db = queryRunner.connection.options.type;
    if (db === 'sqlite') return;
    await queryRunner.query(
      `ALTER TABLE family_settings DROP COLUMN auto_confirm_pending_last_run_date`,
    );
    await queryRunner.query(
      `ALTER TABLE family_settings DROP COLUMN auto_confirm_pending_time`,
    );
    await queryRunner.query(
      `ALTER TABLE family_settings DROP COLUMN auto_confirm_pending_enabled`,
    );
  }
}
