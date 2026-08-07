import { MigrationInterface, QueryRunner } from 'typeorm';

export class StudentAgeBand1740000000018 implements MigrationInterface {
  name = 'StudentAgeBand1740000000018';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const db = queryRunner.connection.options.type;
    if (db === 'sqlite') {
      await queryRunner.query(
        `ALTER TABLE users ADD COLUMN age_band varchar(16)`,
      );
    } else {
      await queryRunner.query(`
ALTER TABLE users
  ADD COLUMN age_band VARCHAR(16) NULL
`);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const db = queryRunner.connection.options.type;
    if (db !== 'sqlite') {
      await queryRunner.query(`ALTER TABLE users DROP COLUMN age_band`);
    }
  }
}
