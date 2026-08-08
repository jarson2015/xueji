import { MigrationInterface, QueryRunner } from 'typeorm';

/** Indexes for today plan filter and journal list/comment preview. */
export class PlanItemJournalIndexes1740000000041 implements MigrationInterface {
  name = 'PlanItemJournalIndexes1740000000041';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const db = queryRunner.connection.options.type;
    if (db === 'sqlite') {
      await queryRunner.query(
        `CREATE INDEX IF NOT EXISTS IDX_plan_items_plan_planned ON plan_items(plan_id, planned_date)`,
      );
      await queryRunner.query(
        `CREATE INDEX IF NOT EXISTS IDX_journal_posts_author_status_id ON journal_posts(author_id, status, id)`,
      );
      await queryRunner.query(
        `CREATE INDEX IF NOT EXISTS IDX_journal_comments_post_status_id ON journal_comments(post_id, status, id)`,
      );
    } else {
      await queryRunner.query(`
CREATE INDEX \`IDX_plan_items_plan_planned\` ON \`plan_items\` (\`plan_id\`, \`planned_date\`)
`);
      await queryRunner.query(`
CREATE INDEX \`IDX_journal_posts_author_status_id\` ON \`journal_posts\` (\`author_id\`, \`status\`, \`id\`)
`);
      await queryRunner.query(`
CREATE INDEX \`IDX_journal_comments_post_status_id\` ON \`journal_comments\` (\`post_id\`, \`status\`, \`id\`)
`);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const db = queryRunner.connection.options.type;
    if (db === 'sqlite') {
      await queryRunner.query(`DROP INDEX IF EXISTS IDX_plan_items_plan_planned`);
      await queryRunner.query(
        `DROP INDEX IF EXISTS IDX_journal_posts_author_status_id`,
      );
      await queryRunner.query(
        `DROP INDEX IF EXISTS IDX_journal_comments_post_status_id`,
      );
    } else {
      await queryRunner.query(
        `DROP INDEX \`IDX_plan_items_plan_planned\` ON \`plan_items\``,
      );
      await queryRunner.query(
        `DROP INDEX \`IDX_journal_posts_author_status_id\` ON \`journal_posts\``,
      );
      await queryRunner.query(
        `DROP INDEX \`IDX_journal_comments_post_status_id\` ON \`journal_comments\``,
      );
    }
  }
}
