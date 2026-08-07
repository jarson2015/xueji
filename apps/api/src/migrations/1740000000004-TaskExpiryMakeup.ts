import { MigrationInterface, QueryRunner } from 'typeorm';

export class TaskExpiryMakeup1740000000004 implements MigrationInterface {
  name = 'TaskExpiryMakeup1740000000004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const db = queryRunner.connection.options.type;
    if (db === 'sqlite') {
      await this.tryAlter(
        queryRunner,
        `ALTER TABLE checkins ADD COLUMN is_makeup boolean NOT NULL DEFAULT 0`,
      );
      await this.tryAlter(
        queryRunner,
        `ALTER TABLE checkins ADD COLUMN makeup_period_key varchar(32)`,
      );
      await this.tryAlter(
        queryRunner,
        `ALTER TABLE family_settings ADD COLUMN makeup_enabled boolean NOT NULL DEFAULT 1`,
      );
      await this.tryAlter(
        queryRunner,
        `ALTER TABLE family_settings ADD COLUMN makeup_discount_percent integer NOT NULL DEFAULT 60`,
      );
      await this.tryAlter(
        queryRunner,
        `ALTER TABLE family_settings ADD COLUMN makeup_window_days integer NOT NULL DEFAULT 7`,
      );
      return;
    }
    await queryRunner.query(`
ALTER TABLE checkins
  ADD COLUMN is_makeup TINYINT NOT NULL DEFAULT 0,
  ADD COLUMN makeup_period_key VARCHAR(32) NULL
`);
    await queryRunner.query(`
ALTER TABLE family_settings
  ADD COLUMN makeup_enabled TINYINT NOT NULL DEFAULT 1,
  ADD COLUMN makeup_discount_percent INT NOT NULL DEFAULT 60,
  ADD COLUMN makeup_window_days INT NOT NULL DEFAULT 7
`);
  }

  private async tryAlter(queryRunner: QueryRunner, sql: string) {
    try {
      await queryRunner.query(sql);
    } catch {
      /* column may exist */
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const db = queryRunner.connection.options.type;
    if (db === 'sqlite') return;
    await queryRunner.query(
      `ALTER TABLE family_settings DROP COLUMN makeup_window_days, DROP COLUMN makeup_discount_percent, DROP COLUMN makeup_enabled`,
    );
    await queryRunner.query(
      `ALTER TABLE checkins DROP COLUMN makeup_period_key, DROP COLUMN is_makeup`,
    );
  }
}
