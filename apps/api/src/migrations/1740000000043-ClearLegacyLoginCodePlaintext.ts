import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * SEC PR2: wipe leftover plaintext login_code after HMAC migration.
 * Auth no longer falls back to the plaintext column.
 */
export class ClearLegacyLoginCodePlaintext1740000000043
  implements MigrationInterface
{
  name = 'ClearLegacyLoginCodePlaintext1740000000043';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const db = queryRunner.connection.options.type;
    if (db === 'sqlite') {
      await queryRunner.query(
        `UPDATE users SET login_code = NULL WHERE login_code IS NOT NULL AND login_code != ''`,
      );
    } else {
      await queryRunner.query(`
UPDATE \`users\` SET \`login_code\` = NULL WHERE \`login_code\` IS NOT NULL AND \`login_code\` != ''
`);
    }
  }

  public async down(): Promise<void> {
    // Irreversible wipe — re-issue codes via parent refresh if needed
  }
}
