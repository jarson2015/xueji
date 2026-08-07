import { MigrationInterface, QueryRunner } from 'typeorm';

export class PointsPactParentGate1740000000009 implements MigrationInterface {
  name = 'PointsPactParentGate1740000000009';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const db = queryRunner.connection.options.type;
    if (db === 'sqlite') {
      await queryRunner.query(
        `ALTER TABLE family_settings ADD COLUMN points_pact_parent_approve_above integer NOT NULL DEFAULT 20`,
      );
    } else {
      await queryRunner.query(`
ALTER TABLE family_settings
  ADD COLUMN points_pact_parent_approve_above INT NOT NULL DEFAULT 20
`);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const db = queryRunner.connection.options.type;
    if (db !== 'sqlite') {
      await queryRunner.query(`
ALTER TABLE family_settings
  DROP COLUMN points_pact_parent_approve_above
`);
    }
  }
}
