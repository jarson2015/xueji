import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Family covenant / education settings:
 * rewardMode, ageBand, reflectionEnabled, goldenFingerNote
 */
export class FamilyCovenantEdu1740000000005 implements MigrationInterface {
  name = 'FamilyCovenantEdu1740000000005';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const db = queryRunner.connection.options.type;
    if (db === 'sqlite') {
      await queryRunner.query(
        `ALTER TABLE family_settings ADD COLUMN reward_mode varchar(24) NOT NULL DEFAULT 'always'`,
      );
      await queryRunner.query(
        `ALTER TABLE family_settings ADD COLUMN age_band varchar(16) NOT NULL DEFAULT 'general'`,
      );
      await queryRunner.query(
        `ALTER TABLE family_settings ADD COLUMN reflection_enabled boolean NOT NULL DEFAULT 1`,
      );
      await queryRunner.query(
        `ALTER TABLE family_settings ADD COLUMN golden_finger_note text`,
      );
      await queryRunner.query(
        `ALTER TABLE family_settings ADD COLUMN covenant_note text`,
      );
    } else {
      await queryRunner.query(`
ALTER TABLE family_settings
  ADD COLUMN reward_mode VARCHAR(24) NOT NULL DEFAULT 'always',
  ADD COLUMN age_band VARCHAR(16) NOT NULL DEFAULT 'general',
  ADD COLUMN reflection_enabled TINYINT NOT NULL DEFAULT 1,
  ADD COLUMN golden_finger_note TEXT NULL,
  ADD COLUMN covenant_note TEXT NULL
`);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const db = queryRunner.connection.options.type;
    if (db === 'sqlite') {
      // SQLite cannot DROP COLUMN easily in older versions — no-op for demo
      return;
    }
    await queryRunner.query(`
ALTER TABLE family_settings
  DROP COLUMN covenant_note,
  DROP COLUMN golden_finger_note,
  DROP COLUMN reflection_enabled,
  DROP COLUMN age_band,
  DROP COLUMN reward_mode
`);
  }
}
