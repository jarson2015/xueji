import { MigrationInterface, QueryRunner } from 'typeorm';

export class GrowthMilestones1740000000027 implements MigrationInterface {
  name = 'GrowthMilestones1740000000027';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const db = queryRunner.connection.options.type;
    if (db === 'sqlite') {
      await queryRunner.query(`
CREATE TABLE growth_milestones (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  title VARCHAR(120) NOT NULL,
  note VARCHAR(200) NULL,
  kind VARCHAR(16) NOT NULL DEFAULT 'manual',
  checkin_id INTEGER NULL,
  task_id INTEGER NULL,
  occurred_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
)`);
      await queryRunner.query(`
CREATE INDEX idx_growth_milestones_student ON growth_milestones(student_id, occurred_at)`);
      return;
    }
    await queryRunner.query(`
CREATE TABLE growth_milestones (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL,
  title VARCHAR(120) NOT NULL,
  note VARCHAR(200) NULL,
  kind VARCHAR(16) NOT NULL DEFAULT 'manual',
  checkin_id INT NULL,
  task_id INT NULL,
  occurred_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_growth_student (student_id, occurred_at),
  CONSTRAINT fk_growth_student FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS growth_milestones`);
  }
}
