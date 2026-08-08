import { MigrationInterface, QueryRunner } from 'typeorm';

/** V1.5 成就奖金：开关 + achievement_claims + entries 追溯列 */
export class AchievementBonus1740000000037 implements MigrationInterface {
  name = 'AchievementBonus1740000000037';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const db = queryRunner.connection.options.type;
    if (db === 'sqlite') {
      await queryRunner.query(
        `ALTER TABLE family_settings ADD COLUMN allowance_achievement_bonus_enabled boolean NOT NULL DEFAULT 0`,
      );
      await queryRunner.query(
        `ALTER TABLE family_settings ADD COLUMN allowance_achievement_bonus_max_cents integer NOT NULL DEFAULT 20000`,
      );
      await queryRunner.query(
        `ALTER TABLE allowance_entries ADD COLUMN ref_type varchar(32)`,
      );
      await queryRunner.query(
        `ALTER TABLE allowance_entries ADD COLUMN ref_id integer`,
      );
      await queryRunner.query(`
CREATE TABLE IF NOT EXISTS achievement_claims (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  family_id INTEGER NOT NULL,
  student_user_id INTEGER NOT NULL,
  title VARCHAR(80) NOT NULL,
  note VARCHAR(200),
  amount_cents INTEGER NOT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'draft',
  posted_ledger_id INTEGER,
  created_by INTEGER NOT NULL,
  posted_by INTEGER,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  posted_at DATETIME
)`);
    } else {
      await queryRunner.query(`
ALTER TABLE \`family_settings\`
  ADD \`allowance_achievement_bonus_enabled\` tinyint NOT NULL DEFAULT 0,
  ADD \`allowance_achievement_bonus_max_cents\` int NOT NULL DEFAULT 20000
`);
      await queryRunner.query(`
ALTER TABLE \`allowance_entries\`
  ADD \`ref_type\` varchar(32) NULL,
  ADD \`ref_id\` int NULL
`);
      await queryRunner.query(`
CREATE TABLE \`achievement_claims\` (
  \`id\` int NOT NULL AUTO_INCREMENT,
  \`family_id\` int NOT NULL,
  \`student_user_id\` int NOT NULL,
  \`title\` varchar(80) NOT NULL,
  \`note\` varchar(200) NULL,
  \`amount_cents\` int NOT NULL,
  \`status\` varchar(16) NOT NULL DEFAULT 'draft',
  \`posted_ledger_id\` int NULL,
  \`created_by\` int NOT NULL,
  \`posted_by\` int NULL,
  \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  \`posted_at\` datetime NULL,
  INDEX \`IDX_achievement_family\` (\`family_id\`),
  INDEX \`IDX_achievement_student\` (\`student_user_id\`),
  PRIMARY KEY (\`id\`)
) ENGINE=InnoDB
`);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const db = queryRunner.connection.options.type;
    if (db === 'sqlite') {
      await queryRunner.query(`DROP TABLE IF EXISTS achievement_claims`);
      // sqlite cannot cheaply drop columns; leave refs
    } else {
      await queryRunner.query(`DROP TABLE \`achievement_claims\``);
      await queryRunner.query(`
ALTER TABLE \`allowance_entries\`
  DROP COLUMN \`ref_type\`,
  DROP COLUMN \`ref_id\`
`);
      await queryRunner.query(`
ALTER TABLE \`family_settings\`
  DROP COLUMN \`allowance_achievement_bonus_enabled\`,
  DROP COLUMN \`allowance_achievement_bonus_max_cents\`
`);
    }
  }
}
