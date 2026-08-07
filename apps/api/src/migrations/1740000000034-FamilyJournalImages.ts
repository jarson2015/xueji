import { MigrationInterface, QueryRunner } from 'typeorm';

/** 家庭说说 P1：帖子配图 URL 列表 */
export class FamilyJournalImages1740000000034 implements MigrationInterface {
  name = 'FamilyJournalImages1740000000034';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`journal_posts\`
      ADD \`image_urls\` json NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`journal_posts\` DROP COLUMN \`image_urls\`
    `);
  }
}
