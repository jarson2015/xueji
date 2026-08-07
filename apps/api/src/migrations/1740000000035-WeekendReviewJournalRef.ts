import { MigrationInterface, QueryRunner } from 'typeorm';

/** 周末小会可弱引用一条家庭说说 */
export class WeekendReviewJournalRef1740000000035 implements MigrationInterface {
  name = 'WeekendReviewJournalRef1740000000035';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`student_weekly_reviews\`
      ADD \`journal_post_id\` int NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`student_weekly_reviews\` DROP COLUMN \`journal_post_id\`
    `);
  }
}
