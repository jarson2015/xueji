import { MigrationInterface, QueryRunner } from 'typeorm';

export class RestDaysPause1740000000012 implements MigrationInterface {
  name = 'RestDaysPause1740000000012';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const db = queryRunner.connection.options.type;
    if (db === 'sqlite') {
      await queryRunner.query(
        `ALTER TABLE family_settings ADD COLUMN rest_days_enabled boolean NOT NULL DEFAULT 0`,
      );
      await queryRunner.query(
        `ALTER TABLE family_settings ADD COLUMN rest_pause_all boolean NOT NULL DEFAULT 0`,
      );
      await queryRunner.query(
        `ALTER TABLE family_settings ADD COLUMN rest_pause_categories text`,
      );
    } else {
      await queryRunner.query(`
ALTER TABLE family_settings
  ADD COLUMN rest_days_enabled TINYINT NOT NULL DEFAULT 0,
  ADD COLUMN rest_pause_all TINYINT NOT NULL DEFAULT 0,
  ADD COLUMN rest_pause_categories JSON NULL
`);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const db = queryRunner.connection.options.type;
    if (db !== 'sqlite') {
      await queryRunner.query(`
ALTER TABLE family_settings
  DROP COLUMN rest_days_enabled,
  DROP COLUMN rest_pause_all,
  DROP COLUMN rest_pause_categories
`);
    }
  }
}
