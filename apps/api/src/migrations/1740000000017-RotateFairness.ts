import { MigrationInterface, QueryRunner } from 'typeorm';

export class RotateFairness1740000000017 implements MigrationInterface {
  name = 'RotateFairness1740000000017';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const db = queryRunner.connection.options.type;
    if (db === 'sqlite') {
      await queryRunner.query(
        `ALTER TABLE tasks ADD COLUMN rotate_enabled boolean NOT NULL DEFAULT 0`,
      );
      await queryRunner.query(
        `ALTER TABLE users ADD COLUMN birth_order integer`,
      );
    } else {
      await queryRunner.query(`
ALTER TABLE tasks
  ADD COLUMN rotate_enabled TINYINT(1) NOT NULL DEFAULT 0
`);
      await queryRunner.query(`
ALTER TABLE users
  ADD COLUMN birth_order INT NULL
`);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const db = queryRunner.connection.options.type;
    if (db !== 'sqlite') {
      await queryRunner.query(`ALTER TABLE tasks DROP COLUMN rotate_enabled`);
      await queryRunner.query(`ALTER TABLE users DROP COLUMN birth_order`);
    }
  }
}
