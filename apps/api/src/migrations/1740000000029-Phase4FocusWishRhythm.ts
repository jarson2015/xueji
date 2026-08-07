import { MigrationInterface, QueryRunner } from 'typeorm';

export class Phase4FocusWishRhythm1740000000029 implements MigrationInterface {
  name = 'Phase4FocusWishRhythm1740000000029';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const db = queryRunner.connection.options.type;
    if (db === 'sqlite') {
      await queryRunner.query(
        `ALTER TABLE checkins ADD COLUMN used_focus boolean NOT NULL DEFAULT 0`,
      );
      await queryRunner.query(
        `ALTER TABLE wish_redeems ADD COLUMN student_ack_at datetime NULL`,
      );
      return;
    }
    await queryRunner.query(`
ALTER TABLE checkins
  ADD COLUMN used_focus TINYINT(1) NOT NULL DEFAULT 0`);
    await queryRunner.query(`
ALTER TABLE wish_redeems
  ADD COLUMN student_ack_at DATETIME NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const db = queryRunner.connection.options.type;
    if (db === 'sqlite') return;
    await queryRunner.query(`ALTER TABLE wish_redeems DROP COLUMN student_ack_at`);
    await queryRunner.query(`ALTER TABLE checkins DROP COLUMN used_focus`);
  }
}
