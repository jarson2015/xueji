import { MigrationInterface, QueryRunner } from 'typeorm';

export class TaskSourceTemplateId1740000000011 implements MigrationInterface {
  name = 'TaskSourceTemplateId1740000000011';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const db = queryRunner.connection.options.type;
    if (db === 'sqlite') {
      await queryRunner.query(
        `ALTER TABLE tasks ADD COLUMN source_template_id varchar(64)`,
      );
    } else {
      await queryRunner.query(`
ALTER TABLE tasks
  ADD COLUMN source_template_id VARCHAR(64) NULL
`);
    }

    // Best-effort backfill for known EQ / life templates (title match)
    const pairs: Array<[string, string]> = [
      ['eq-mood', '说出今天的心情'],
      ['eq-thanks', '感谢家人一件事'],
      ['eq-listen', '认真听对方说完'],
      ['life-laundry', '把自己的脏衣服放进洗衣篮'],
      ['life-time', '自己定一个 10 分钟小目标'],
    ];
    for (const [id, title] of pairs) {
      await queryRunner.query(
        `UPDATE tasks SET source_template_id = ? WHERE source_template_id IS NULL AND title = ?`,
        [id, title],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const db = queryRunner.connection.options.type;
    if (db !== 'sqlite') {
      await queryRunner.query(`
ALTER TABLE tasks
  DROP COLUMN source_template_id
`);
    }
  }
}
