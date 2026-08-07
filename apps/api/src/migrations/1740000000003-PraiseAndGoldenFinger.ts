import { MigrationInterface, QueryRunner } from 'typeorm';

export class PraiseAndGoldenFinger1740000000003 implements MigrationInterface {
  name = 'PraiseAndGoldenFinger1740000000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const db = queryRunner.connection.options.type;
    if (db === 'sqlite') {
      await this.upSqlite(queryRunner);
      return;
    }
    await queryRunner.query(`
ALTER TABLE checkins
  ADD COLUMN parent_liked TINYINT NOT NULL DEFAULT 0,
  ADD COLUMN parent_comment VARCHAR(200) NULL
`);
    await queryRunner.query(`
ALTER TABLE wish_items
  ADD COLUMN type VARCHAR(20) NOT NULL DEFAULT 'normal'
`);
    await queryRunner.query(`
ALTER TABLE wish_redeems
  ADD COLUMN effect_type VARCHAR(32) NULL,
  ADD COLUMN effect_assign_id INT NULL,
  ADD COLUMN effect_title VARCHAR(120) NULL
`);
  }

  private async upSqlite(queryRunner: QueryRunner): Promise<void> {
    // Local sqlite usually uses synchronize; keep additive IF NOT EXISTS style where possible
    try {
      await queryRunner.query(
        `ALTER TABLE checkins ADD COLUMN parent_liked boolean NOT NULL DEFAULT 0`,
      );
    } catch {
      /* exists */
    }
    try {
      await queryRunner.query(
        `ALTER TABLE checkins ADD COLUMN parent_comment varchar(200)`,
      );
    } catch {
      /* exists */
    }
    try {
      await queryRunner.query(
        `ALTER TABLE wish_items ADD COLUMN type varchar(20) NOT NULL DEFAULT 'normal'`,
      );
    } catch {
      /* exists */
    }
    try {
      await queryRunner.query(
        `ALTER TABLE wish_redeems ADD COLUMN effect_type varchar(32)`,
      );
    } catch {
      /* exists */
    }
    try {
      await queryRunner.query(
        `ALTER TABLE wish_redeems ADD COLUMN effect_assign_id integer`,
      );
    } catch {
      /* exists */
    }
    try {
      await queryRunner.query(
        `ALTER TABLE wish_redeems ADD COLUMN effect_title varchar(120)`,
      );
    } catch {
      /* exists */
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const db = queryRunner.connection.options.type;
    if (db === 'sqlite') return;
    await queryRunner.query(
      `ALTER TABLE wish_redeems DROP COLUMN effect_title, DROP COLUMN effect_assign_id, DROP COLUMN effect_type`,
    );
    await queryRunner.query(`ALTER TABLE wish_items DROP COLUMN type`);
    await queryRunner.query(
      `ALTER TABLE checkins DROP COLUMN parent_comment, DROP COLUMN parent_liked`,
    );
  }
}
