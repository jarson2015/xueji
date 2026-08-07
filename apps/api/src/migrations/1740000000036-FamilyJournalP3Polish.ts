import { MigrationInterface, QueryRunner } from 'typeorm';

/** P3：说说 Push 偏好 + 周末小会引用摘要快照 */
export class FamilyJournalP3Polish1740000000036 implements MigrationInterface {
  name = 'FamilyJournalP3Polish1740000000036';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`journal_user_prefs\` (
        \`user_id\` int NOT NULL,
        \`comment_push_enabled\` tinyint NOT NULL DEFAULT 1,
        PRIMARY KEY (\`user_id\`)
      ) ENGINE=InnoDB
    `);
    await queryRunner.query(`
      ALTER TABLE \`student_weekly_reviews\`
      ADD \`journal_post_summary\` varchar(120) NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`student_weekly_reviews\` DROP COLUMN \`journal_post_summary\`
    `);
    await queryRunner.query(`DROP TABLE \`journal_user_prefs\``);
  }
}
