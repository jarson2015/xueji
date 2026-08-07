import { MigrationInterface, QueryRunner } from 'typeorm';

export class SlotExtended1740000000016 implements MigrationInterface {
  name = 'SlotExtended1740000000016';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const db = queryRunner.connection.options.type;
    if (db === 'sqlite') {
      await queryRunner.query(
        `ALTER TABLE family_settings ADD COLUMN slot_extended_enabled boolean NOT NULL DEFAULT 0`,
      );
      await queryRunner.query(
        `ALTER TABLE family_settings ADD COLUMN slot_clock_map text`,
      );
    } else {
      await queryRunner.query(`
ALTER TABLE family_settings
  ADD COLUMN slot_extended_enabled TINYINT(1) NOT NULL DEFAULT 0,
  ADD COLUMN slot_clock_map JSON NULL
`);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const db = queryRunner.connection.options.type;
    if (db !== 'sqlite') {
      await queryRunner.query(
        `ALTER TABLE family_settings DROP COLUMN slot_extended_enabled`,
      );
      await queryRunner.query(
        `ALTER TABLE family_settings DROP COLUMN slot_clock_map`,
      );
    }
  }
}
