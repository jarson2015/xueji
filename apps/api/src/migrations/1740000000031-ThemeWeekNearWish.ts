import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * P0：主题周字段 + 近端愿望标记
 * docs/EDU_THEME_PORTFOLIO_NEAR_P0_PLAN.md
 */
export class ThemeWeekNearWish1740000000031 implements MigrationInterface {
  name = 'ThemeWeekNearWish1740000000031';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`student_weekly_goals\`
        ADD \`theme_preset\` varchar(32) NOT NULL DEFAULT '',
        ADD \`theme_title\` varchar(40) NOT NULL DEFAULT ''
    `);
    await queryRunner.query(`
      ALTER TABLE \`wish_items\`
        ADD \`is_near_term\` tinyint NOT NULL DEFAULT 0
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`wish_items\` DROP COLUMN \`is_near_term\`
    `);
    await queryRunner.query(`
      ALTER TABLE \`student_weekly_goals\`
        DROP COLUMN \`theme_title\`,
        DROP COLUMN \`theme_preset\`
    `);
  }
}
