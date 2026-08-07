import { MigrationInterface, QueryRunner } from 'typeorm';

export class EduLoopDeepen1740000000010 implements MigrationInterface {
  name = 'EduLoopDeepen1740000000010';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const db = queryRunner.connection.options.type;
    if (db === 'sqlite') {
      await queryRunner.query(
        `ALTER TABLE checkins ADD COLUMN reflection_text varchar(500)`,
      );
      await queryRunner.query(
        `ALTER TABLE checkins ADD COLUMN reflection_prompt varchar(120)`,
      );
      await queryRunner.query(`
CREATE TABLE IF NOT EXISTS covenant_proposals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  proposed_text VARCHAR(300) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  resolved_by_parent_id INTEGER,
  resolved_at DATETIME,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
)`);
    } else {
      await queryRunner.query(`
ALTER TABLE checkins
  ADD COLUMN reflection_text VARCHAR(500) NULL,
  ADD COLUMN reflection_prompt VARCHAR(120) NULL
`);
      await queryRunner.query(`
CREATE TABLE IF NOT EXISTS covenant_proposals (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL,
  proposed_text VARCHAR(300) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  resolved_by_parent_id INT NULL,
  resolved_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_covenant_proposals_student (student_id),
  INDEX idx_covenant_proposals_status (status)
)`);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS covenant_proposals`);
    const db = queryRunner.connection.options.type;
    if (db !== 'sqlite') {
      await queryRunner.query(`
ALTER TABLE checkins
  DROP COLUMN reflection_text,
  DROP COLUMN reflection_prompt
`);
    }
  }
}
