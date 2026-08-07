import { MigrationInterface, QueryRunner } from 'typeorm';

export class TaskProposals1740000000023 implements MigrationInterface {
  name = 'TaskProposals1740000000023';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const db = queryRunner.connection.options.type;
    if (db === 'sqlite') {
      await queryRunner.query(`
CREATE TABLE task_proposals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  title VARCHAR(120) NOT NULL,
  description TEXT NULL,
  category VARCHAR(20) NOT NULL DEFAULT 'study',
  suggested_minutes INTEGER NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  parent_id INTEGER NULL,
  approved_task_id INTEGER NULL,
  reject_note VARCHAR(200) NULL,
  resolved_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (approved_task_id) REFERENCES tasks(id) ON DELETE SET NULL
)
`);
    } else {
      await queryRunner.query(`
CREATE TABLE task_proposals (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL,
  title VARCHAR(120) NOT NULL,
  description TEXT NULL,
  category VARCHAR(20) NOT NULL DEFAULT 'study',
  suggested_minutes INT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  parent_id INT NULL,
  approved_task_id INT NULL,
  reject_note VARCHAR(200) NULL,
  resolved_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_task_proposals_student FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_task_proposals_task FOREIGN KEY (approved_task_id) REFERENCES tasks(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
`);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS task_proposals`);
  }
}
