import { MigrationInterface, QueryRunner } from 'typeorm';

/** P1.1: new families default reward_mode random (column default only). */
export class Phase1RewardDefault1740000000022 implements MigrationInterface {
  name = 'Phase1RewardDefault1740000000022';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const db = queryRunner.connection.options.type;
    if (db === 'sqlite') return;
    await queryRunner.query(`
ALTER TABLE family_settings
  MODIFY COLUMN reward_mode VARCHAR(24) NOT NULL DEFAULT 'random'
`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const db = queryRunner.connection.options.type;
    if (db === 'sqlite') return;
    await queryRunner.query(`
ALTER TABLE family_settings
  MODIFY COLUMN reward_mode VARCHAR(24) NOT NULL DEFAULT 'always'
`);
  }
}
