import { MigrationInterface, QueryRunner } from 'typeorm';

export class WishPropose1740000000013 implements MigrationInterface {
  name = 'WishPropose1740000000013';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const db = queryRunner.connection.options.type;
    if (db === 'sqlite') {
      await queryRunner.query(
        `ALTER TABLE wish_items ADD COLUMN proposed boolean NOT NULL DEFAULT 0`,
      );
    } else {
      await queryRunner.query(`
ALTER TABLE wish_items
  ADD COLUMN proposed TINYINT NOT NULL DEFAULT 0
`);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const db = queryRunner.connection.options.type;
    if (db !== 'sqlite') {
      await queryRunner.query(`
ALTER TABLE wish_items
  DROP COLUMN proposed
`);
    }
  }
}
