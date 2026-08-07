import { MigrationInterface, QueryRunner } from 'typeorm';

/** P2 defaults: makeup 50%, wish kind experience (column defaults only). */
export class EduMotivationP2Defaults1740000000019 implements MigrationInterface {
  name = 'EduMotivationP2Defaults1740000000019';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const db = queryRunner.connection.options.type;
    if (db === 'sqlite') {
      // SQLite cannot ALTER COLUMN DEFAULT easily; new rows use entity defaults via TypeORM.
      return;
    }
    await queryRunner.query(`
ALTER TABLE family_settings
  MODIFY COLUMN makeup_discount_percent INT NOT NULL DEFAULT 50
`);
    await queryRunner.query(`
ALTER TABLE wish_items
  MODIFY COLUMN kind VARCHAR(20) NOT NULL DEFAULT 'experience'
`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const db = queryRunner.connection.options.type;
    if (db === 'sqlite') return;
    await queryRunner.query(`
ALTER TABLE family_settings
  MODIFY COLUMN makeup_discount_percent INT NOT NULL DEFAULT 60
`);
    await queryRunner.query(`
ALTER TABLE wish_items
  MODIFY COLUMN kind VARCHAR(20) NOT NULL DEFAULT 'item'
`);
  }
}
