import { MigrationInterface, QueryRunner } from 'typeorm';

export class PushSubscriptions1740000000002 implements MigrationInterface {
  name = 'PushSubscriptions1740000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const db = queryRunner.connection.options.type;
    if (db === 'sqlite') {
      await queryRunner.query(`
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  user_id INTEGER NOT NULL,
  endpoint TEXT NOT NULL,
  p256dh VARCHAR(255) NOT NULL,
  auth VARCHAR(255) NOT NULL,
  user_agent VARCHAR(255),
  created_at DATETIME NOT NULL DEFAULT (datetime('now')),
  CONSTRAINT UQ_push_endpoint UNIQUE (endpoint)
)`);
      await queryRunner.query(
        `CREATE INDEX IF NOT EXISTS IDX_push_user ON push_subscriptions (user_id)`,
      );
      return;
    }
    await queryRunner.query(`
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id INT NOT NULL AUTO_INCREMENT,
  user_id INT NOT NULL,
  endpoint TEXT NOT NULL,
  p256dh VARCHAR(255) NOT NULL,
  auth VARCHAR(255) NOT NULL,
  user_agent VARCHAR(255) NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  UNIQUE INDEX UQ_push_endpoint (endpoint(255)),
  INDEX IDX_push_user (user_id),
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS push_subscriptions`);
  }
}
