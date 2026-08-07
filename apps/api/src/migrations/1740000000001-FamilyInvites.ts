import { MigrationInterface, QueryRunner } from 'typeorm';

/** Additive: co-parent invite codes. Safe on DBs that already used synchronize. */
export class FamilyInvites1740000000001 implements MigrationInterface {
  name = 'FamilyInvites1740000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const db = queryRunner.connection.options.type;
    if (db === 'sqlite') {
      await queryRunner.query(`
CREATE TABLE IF NOT EXISTS family_invites (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  from_parent_id INTEGER NOT NULL,
  code VARCHAR(8) NOT NULL,
  expires_at DATETIME NOT NULL,
  accepted_by_parent_id INTEGER,
  accepted_at DATETIME,
  created_at DATETIME NOT NULL DEFAULT (datetime('now')),
  CONSTRAINT UQ_family_invites_code UNIQUE (code)
)`);
      return;
    }
    await queryRunner.query(`
CREATE TABLE IF NOT EXISTS family_invites (
  id INT NOT NULL AUTO_INCREMENT,
  from_parent_id INT NOT NULL,
  code VARCHAR(8) NOT NULL,
  expires_at DATETIME NOT NULL,
  accepted_by_parent_id INT NULL,
  accepted_at DATETIME NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  UNIQUE INDEX IDX_family_invites_code (code),
  PRIMARY KEY (id)
) ENGINE=InnoDB`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS family_invites`);
  }
}
