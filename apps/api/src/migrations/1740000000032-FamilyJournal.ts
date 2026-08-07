import { MigrationInterface, QueryRunner } from 'typeorm';

/** 家庭手账 + 学生私密日记 P0 */
export class FamilyJournal1740000000032 implements MigrationInterface {
  name = 'FamilyJournal1740000000032';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`journal_posts\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`author_id\` int NOT NULL,
        \`title\` varchar(80) NULL,
        \`body\` text NOT NULL,
        \`mood_tag\` varchar(16) NULL,
        \`visibility\` varchar(16) NOT NULL DEFAULT 'family',
        \`status\` varchar(16) NOT NULL DEFAULT 'active',
        \`source_private_diary_id\` int NULL,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        INDEX \`IDX_journal_posts_author\` (\`author_id\`),
        INDEX \`IDX_journal_posts_created\` (\`created_at\`),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB
    `);
    await queryRunner.query(`
      CREATE TABLE \`journal_comments\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`post_id\` int NOT NULL,
        \`author_id\` int NOT NULL,
        \`body\` varchar(400) NOT NULL,
        \`parent_comment_id\` int NULL,
        \`status\` varchar(16) NOT NULL DEFAULT 'active',
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        INDEX \`IDX_journal_comments_post\` (\`post_id\`),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB
    `);
    await queryRunner.query(`
      CREATE TABLE \`private_diary_entries\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`student_id\` int NOT NULL,
        \`body\` text NOT NULL,
        \`mood_tag\` varchar(16) NULL,
        \`status\` varchar(16) NOT NULL DEFAULT 'active',
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        INDEX \`IDX_private_diary_student\` (\`student_id\`),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB
    `);
    await queryRunner.query(`
      CREATE TABLE \`journal_student_prefs\` (
        \`student_id\` int NOT NULL,
        \`private_diary_enabled\` tinyint NOT NULL DEFAULT 0,
        \`private_diary_enabled_at\` datetime NULL,
        PRIMARY KEY (\`student_id\`)
      ) ENGINE=InnoDB
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE \`journal_student_prefs\``);
    await queryRunner.query(`DROP TABLE \`private_diary_entries\``);
    await queryRunner.query(`DROP TABLE \`journal_comments\``);
    await queryRunner.query(`DROP TABLE \`journal_posts\``);
  }
}
