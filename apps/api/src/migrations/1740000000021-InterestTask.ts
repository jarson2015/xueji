import { MigrationInterface, QueryRunner } from 'typeorm';

/** 兴趣任务：is_interest + meaning_note（为什么值得做） */
export class InterestTask1740000000021 implements MigrationInterface {
  name = 'InterestTask1740000000021';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const db = queryRunner.connection.options.type;
    if (db === 'sqlite') {
      await queryRunner.query(
        `ALTER TABLE tasks ADD COLUMN is_interest boolean NOT NULL DEFAULT 0`,
      );
      await queryRunner.query(
        `ALTER TABLE tasks ADD COLUMN meaning_note varchar(160)`,
      );
      return;
    }
    await queryRunner.query(
      `ALTER TABLE \`tasks\` ADD \`is_interest\` tinyint NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(
      `ALTER TABLE \`tasks\` ADD \`meaning_note\` varchar(160) NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const db = queryRunner.connection.options.type;
    if (db === 'sqlite') {
      // SQLite: best-effort no-op for drop column
      return;
    }
    await queryRunner.query(
      `ALTER TABLE \`tasks\` DROP COLUMN \`meaning_note\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`tasks\` DROP COLUMN \`is_interest\``,
    );
  }
}
