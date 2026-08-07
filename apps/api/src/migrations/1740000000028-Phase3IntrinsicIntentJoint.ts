import { MigrationInterface, QueryRunner } from 'typeorm';

export class Phase3IntrinsicIntentJoint1740000000028 implements MigrationInterface {
  name = 'Phase3IntrinsicIntentJoint1740000000028';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const db = queryRunner.connection.options.type;
    if (db === 'sqlite') {
      await queryRunner.query(
        `ALTER TABLE family_settings ADD COLUMN intrinsic_mode boolean NOT NULL DEFAULT 0`,
      );
      await queryRunner.query(
        `ALTER TABLE tasks ADD COLUMN intention_cue varchar(120) NULL`,
      );
      await queryRunner.query(
        `ALTER TABLE tasks ADD COLUMN intention_when varchar(120) NULL`,
      );
      await queryRunner.query(
        `ALTER TABLE tasks ADD COLUMN is_micro_habit boolean NOT NULL DEFAULT 0`,
      );
      await queryRunner.query(
        `ALTER TABLE tasks ADD COLUMN joint_complete boolean NOT NULL DEFAULT 0`,
      );
      await queryRunner.query(
        `ALTER TABLE checkins ADD COLUMN client_id varchar(36) NULL`,
      );
      await queryRunner.query(
        `CREATE UNIQUE INDEX idx_checkins_client_id ON checkins(client_id) WHERE client_id IS NOT NULL`,
      );
      return;
    }
    await queryRunner.query(`
ALTER TABLE family_settings
  ADD COLUMN intrinsic_mode TINYINT(1) NOT NULL DEFAULT 0`);
    await queryRunner.query(`
ALTER TABLE tasks
  ADD COLUMN intention_cue VARCHAR(120) NULL,
  ADD COLUMN intention_when VARCHAR(120) NULL,
  ADD COLUMN is_micro_habit TINYINT(1) NOT NULL DEFAULT 0,
  ADD COLUMN joint_complete TINYINT(1) NOT NULL DEFAULT 0`);
    await queryRunner.query(`
ALTER TABLE checkins
  ADD COLUMN client_id VARCHAR(36) NULL,
  ADD UNIQUE INDEX idx_checkins_client_id (client_id)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const db = queryRunner.connection.options.type;
    if (db === 'sqlite') {
      // sqlite cannot drop columns easily; noop for dev
      return;
    }
    await queryRunner.query(`ALTER TABLE checkins DROP INDEX idx_checkins_client_id`);
    await queryRunner.query(`ALTER TABLE checkins DROP COLUMN client_id`);
    await queryRunner.query(`ALTER TABLE tasks DROP COLUMN joint_complete`);
    await queryRunner.query(`ALTER TABLE tasks DROP COLUMN is_micro_habit`);
    await queryRunner.query(`ALTER TABLE tasks DROP COLUMN intention_when`);
    await queryRunner.query(`ALTER TABLE tasks DROP COLUMN intention_cue`);
    await queryRunner.query(`ALTER TABLE family_settings DROP COLUMN intrinsic_mode`);
  }
}
