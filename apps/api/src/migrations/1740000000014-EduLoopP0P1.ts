import { MigrationInterface, QueryRunner } from 'typeorm';

export class EduLoopP0P11740000000014 implements MigrationInterface {
  name = 'EduLoopP0P11740000000014';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const db = queryRunner.connection.options.type;
    if (db === 'sqlite') {
      await queryRunner.query(
        `ALTER TABLE wish_items ADD COLUMN kind varchar(20) NOT NULL DEFAULT 'item'`,
      );
      await queryRunner.query(
        `ALTER TABLE task_assigns ADD COLUMN skip_date varchar(10)`,
      );
      await queryRunner.query(
        `ALTER TABLE family_settings ADD COLUMN daily_skip_limit integer NOT NULL DEFAULT 1`,
      );
    } else {
      await queryRunner.query(`
ALTER TABLE wish_items
  ADD COLUMN kind VARCHAR(20) NOT NULL DEFAULT 'item'
`);
      await queryRunner.query(`
ALTER TABLE task_assigns
  ADD COLUMN skip_date VARCHAR(10) NULL
`);
      await queryRunner.query(`
ALTER TABLE family_settings
  ADD COLUMN daily_skip_limit INT NOT NULL DEFAULT 1
`);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const db = queryRunner.connection.options.type;
    if (db !== 'sqlite') {
      await queryRunner.query(`ALTER TABLE wish_items DROP COLUMN kind`);
      await queryRunner.query(`ALTER TABLE task_assigns DROP COLUMN skip_date`);
      await queryRunner.query(
        `ALTER TABLE family_settings DROP COLUMN daily_skip_limit`,
      );
    }
  }
}
