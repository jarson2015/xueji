import { MigrationInterface, QueryRunner } from 'typeorm';

export class StudentPrefs1740000000024 implements MigrationInterface {
  name = 'StudentPrefs1740000000024';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const db = queryRunner.connection.options.type;
    if (db === 'sqlite') {
      await queryRunner.query(`
CREATE TABLE student_weekly_goals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  week_key VARCHAR(12) NOT NULL,
  text VARCHAR(80) NOT NULL DEFAULT '',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
)`);
      await queryRunner.query(`
CREATE UNIQUE INDEX idx_student_weekly_goals_student_week
  ON student_weekly_goals(student_id, week_key)`);
      await queryRunner.query(`
CREATE TABLE student_daily_focus (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  day_key VARCHAR(10) NOT NULL,
  focus_keys TEXT NOT NULL DEFAULT '[]',
  swaps INTEGER NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
)`);
      await queryRunner.query(`
CREATE UNIQUE INDEX idx_student_daily_focus_student_day
  ON student_daily_focus(student_id, day_key)`);
      return;
    }
    await queryRunner.query(`
CREATE TABLE student_weekly_goals (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL,
  week_key VARCHAR(12) NOT NULL,
  text VARCHAR(80) NOT NULL DEFAULT '',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_student_week (student_id, week_key),
  CONSTRAINT fk_weekly_goal_student FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    await queryRunner.query(`
CREATE TABLE student_daily_focus (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL,
  day_key VARCHAR(10) NOT NULL,
  focus_keys JSON NOT NULL,
  swaps INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_student_day (student_id, day_key),
  CONSTRAINT fk_daily_focus_student FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS student_daily_focus`);
    await queryRunner.query(`DROP TABLE IF EXISTS student_weekly_goals`);
  }
}
