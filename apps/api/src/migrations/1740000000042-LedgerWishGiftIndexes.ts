import { MigrationInterface, QueryRunner } from 'typeorm';

/** Indexes for weekly report ledgers, wish lists, gift fairness. */
export class LedgerWishGiftIndexes1740000000042 implements MigrationInterface {
  name = 'LedgerWishGiftIndexes1740000000042';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const db = queryRunner.connection.options.type;
    if (db === 'sqlite') {
      await queryRunner.query(
        `CREATE INDEX IF NOT EXISTS IDX_point_ledgers_student_created ON point_ledgers(student_id, created_at)`,
      );
      await queryRunner.query(
        `CREATE INDEX IF NOT EXISTS IDX_wish_items_student_id ON wish_items(student_id)`,
      );
      await queryRunner.query(
        `CREATE INDEX IF NOT EXISTS IDX_point_gifts_from_status_accepted ON point_gifts(from_student_id, status, accepted_at)`,
      );
    } else {
      await queryRunner.query(`
CREATE INDEX \`IDX_point_ledgers_student_created\` ON \`point_ledgers\` (\`student_id\`, \`created_at\`)
`);
      await queryRunner.query(`
CREATE INDEX \`IDX_wish_items_student_id\` ON \`wish_items\` (\`student_id\`)
`);
      await queryRunner.query(`
CREATE INDEX \`IDX_point_gifts_from_status_accepted\` ON \`point_gifts\` (\`from_student_id\`, \`status\`, \`accepted_at\`)
`);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const db = queryRunner.connection.options.type;
    if (db === 'sqlite') {
      await queryRunner.query(
        `DROP INDEX IF EXISTS IDX_point_ledgers_student_created`,
      );
      await queryRunner.query(`DROP INDEX IF EXISTS IDX_wish_items_student_id`);
      await queryRunner.query(
        `DROP INDEX IF EXISTS IDX_point_gifts_from_status_accepted`,
      );
    } else {
      await queryRunner.query(
        `DROP INDEX \`IDX_point_ledgers_student_created\` ON \`point_ledgers\``,
      );
      await queryRunner.query(
        `DROP INDEX \`IDX_wish_items_student_id\` ON \`wish_items\``,
      );
      await queryRunner.query(
        `DROP INDEX \`IDX_point_gifts_from_status_accepted\` ON \`point_gifts\``,
      );
    }
  }
}
