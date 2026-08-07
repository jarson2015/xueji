import { MigrationInterface, QueryRunner } from 'typeorm';

export class SharedComplete1740000000015 implements MigrationInterface {
  name = 'SharedComplete1740000000015';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const db = queryRunner.connection.options.type;
    if (db === 'sqlite') {
      await queryRunner.query(
        `ALTER TABLE tasks ADD COLUMN shared_complete boolean NOT NULL DEFAULT 0`,
      );
    } else {
      await queryRunner.query(`
ALTER TABLE tasks
  ADD COLUMN shared_complete TINYINT(1) NOT NULL DEFAULT 0
`);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const db = queryRunner.connection.options.type;
    if (db !== 'sqlite') {
      await queryRunner.query(`ALTER TABLE tasks DROP COLUMN shared_complete`);
    }
  }
}
