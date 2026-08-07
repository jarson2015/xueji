import { MigrationInterface, QueryRunner } from 'typeorm';

export class Phase2MoodDifficulty1740000000025 implements MigrationInterface {
  name = 'Phase2MoodDifficulty1740000000025';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const db = queryRunner.connection.options.type;
    if (db === 'sqlite') {
      await queryRunner.query(
        `ALTER TABLE checkins ADD COLUMN mood_tag VARCHAR(16) NULL`,
      );
      await queryRunner.query(
        `ALTER TABLE tasks ADD COLUMN difficulty_level VARCHAR(16) NOT NULL DEFAULT 'practice'`,
      );
      return;
    }
    await queryRunner.query(`
ALTER TABLE checkins
  ADD COLUMN mood_tag VARCHAR(16) NULL
`);
    await queryRunner.query(`
ALTER TABLE tasks
  ADD COLUMN difficulty_level VARCHAR(16) NOT NULL DEFAULT 'practice'
`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const db = queryRunner.connection.options.type;
    if (db === 'sqlite') return;
    await queryRunner.query(`ALTER TABLE checkins DROP COLUMN mood_tag`);
    await queryRunner.query(`ALTER TABLE tasks DROP COLUMN difficulty_level`);
  }
}
