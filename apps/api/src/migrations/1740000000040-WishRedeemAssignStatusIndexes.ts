import { MigrationInterface, QueryRunner } from 'typeorm';

/** Indexes for monitor redeem/gift filters and assign status scans. */
export class WishRedeemAssignStatusIndexes1740000000040
  implements MigrationInterface
{
  name = 'WishRedeemAssignStatusIndexes1740000000040';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const db = queryRunner.connection.options.type;
    if (db === 'sqlite') {
      await queryRunner.query(
        `CREATE INDEX IF NOT EXISTS IDX_wish_redeems_student_status_created ON wish_redeems(student_id, status, created_at)`,
      );
      await queryRunner.query(
        `CREATE INDEX IF NOT EXISTS IDX_task_assigns_student_status ON task_assigns(student_id, status)`,
      );
    } else {
      await queryRunner.query(`
CREATE INDEX \`IDX_wish_redeems_student_status_created\` ON \`wish_redeems\` (\`student_id\`, \`status\`, \`created_at\`)
`);
      await queryRunner.query(`
CREATE INDEX \`IDX_task_assigns_student_status\` ON \`task_assigns\` (\`student_id\`, \`status\`)
`);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const db = queryRunner.connection.options.type;
    if (db === 'sqlite') {
      await queryRunner.query(
        `DROP INDEX IF EXISTS IDX_wish_redeems_student_status_created`,
      );
      await queryRunner.query(
        `DROP INDEX IF EXISTS IDX_task_assigns_student_status`,
      );
    } else {
      await queryRunner.query(
        `DROP INDEX \`IDX_wish_redeems_student_status_created\` ON \`wish_redeems\``,
      );
      await queryRunner.query(
        `DROP INDEX \`IDX_task_assigns_student_status\` ON \`task_assigns\``,
      );
    }
  }
}
