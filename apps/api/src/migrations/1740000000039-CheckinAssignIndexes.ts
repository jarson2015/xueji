import { MigrationInterface, QueryRunner } from 'typeorm';

/** Hot-path indexes for monitor / streaks / pending / assigns-by-student. */
export class CheckinAssignIndexes1740000000039 implements MigrationInterface {
  name = 'CheckinAssignIndexes1740000000039';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const db = queryRunner.connection.options.type;
    if (db === 'sqlite') {
      await queryRunner.query(
        `CREATE INDEX IF NOT EXISTS IDX_checkins_student_created ON checkins(student_id, created_at)`,
      );
      await queryRunner.query(
        `CREATE INDEX IF NOT EXISTS IDX_checkins_student_confirm_created ON checkins(student_id, confirm_status, created_at)`,
      );
      await queryRunner.query(
        `CREATE INDEX IF NOT EXISTS IDX_task_assigns_student ON task_assigns(student_id)`,
      );
    } else {
      await queryRunner.query(`
CREATE INDEX \`IDX_checkins_student_created\` ON \`checkins\` (\`student_id\`, \`created_at\`)
`);
      await queryRunner.query(`
CREATE INDEX \`IDX_checkins_student_confirm_created\` ON \`checkins\` (\`student_id\`, \`confirm_status\`, \`created_at\`)
`);
      await queryRunner.query(`
CREATE INDEX \`IDX_task_assigns_student\` ON \`task_assigns\` (\`student_id\`)
`);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const db = queryRunner.connection.options.type;
    if (db === 'sqlite') {
      await queryRunner.query(
        `DROP INDEX IF EXISTS IDX_checkins_student_created`,
      );
      await queryRunner.query(
        `DROP INDEX IF EXISTS IDX_checkins_student_confirm_created`,
      );
      await queryRunner.query(
        `DROP INDEX IF EXISTS IDX_task_assigns_student`,
      );
    } else {
      await queryRunner.query(
        `DROP INDEX \`IDX_checkins_student_created\` ON \`checkins\``,
      );
      await queryRunner.query(
        `DROP INDEX \`IDX_checkins_student_confirm_created\` ON \`checkins\``,
      );
      await queryRunner.query(
        `DROP INDEX \`IDX_task_assigns_student\` ON \`task_assigns\``,
      );
    }
  }
}
