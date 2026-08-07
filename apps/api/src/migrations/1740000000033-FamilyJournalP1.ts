import { MigrationInterface, QueryRunner } from 'typeorm';

/** 家庭手账 P1：轻未读已读游标 */
export class FamilyJournalP11740000000033 implements MigrationInterface {
  name = 'FamilyJournalP11740000000033';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`journal_reader_state\` (
        \`user_id\` int NOT NULL,
        \`feed_seen_at\` datetime NULL,
        PRIMARY KEY (\`user_id\`)
      ) ENGINE=InnoDB
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE \`journal_reader_state\``);
  }
}
