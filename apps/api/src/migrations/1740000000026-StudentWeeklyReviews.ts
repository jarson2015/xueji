import { MigrationInterface, QueryRunner } from 'typeorm';

export class StudentWeeklyReviews1740000000026 implements MigrationInterface {
  name = 'StudentWeeklyReviews1740000000026';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const db = queryRunner.connection.options.type;
    if (db === 'sqlite') {
      await queryRunner.query(`
CREATE TABLE student_weekly_reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  week_key VARCHAR(12) NOT NULL,
  proud_text VARCHAR(120) NOT NULL DEFAULT '',
  change_text VARCHAR(120) NOT NULL DEFAULT '',
  promise_text VARCHAR(120) NOT NULL DEFAULT '',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
)`);
      await queryRunner.query(`
CREATE UNIQUE INDEX idx_student_weekly_reviews_student_week
  ON student_weekly_reviews(student_id, week_key)`);
      return;
    }
    await queryRunner.query(`
CREATE TABLE student_weekly_reviews (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL,
  week_key VARCHAR(12) NOT NULL,
  proud_text VARCHAR(120) NOT NULL DEFAULT '',
  change_text VARCHAR(120) NOT NULL DEFAULT '',
  promise_text VARCHAR(120) NOT NULL DEFAULT '',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_student_week (student_id, week_key),
  CONSTRAINT fk_weekly_review_student FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS student_weekly_reviews`);
  }
}
