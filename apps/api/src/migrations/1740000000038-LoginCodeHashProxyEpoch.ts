import { MigrationInterface, QueryRunner } from 'typeorm';
import { hashLoginCode } from '../common/login-code';

/** Hash login codes at rest; add proxy_epoch for 代登 revoke on code refresh. */
export class LoginCodeHashProxyEpoch1740000000038 implements MigrationInterface {
  name = 'LoginCodeHashProxyEpoch1740000000038';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const db = queryRunner.connection.options.type;
    if (db === 'sqlite') {
      await queryRunner.query(
        `ALTER TABLE users ADD COLUMN login_code_hash varchar(64)`,
      );
      await queryRunner.query(
        `ALTER TABLE users ADD COLUMN login_code_hint varchar(2)`,
      );
      await queryRunner.query(
        `ALTER TABLE users ADD COLUMN proxy_epoch integer NOT NULL DEFAULT 0`,
      );
    } else {
      await queryRunner.query(`
ALTER TABLE \`users\`
  ADD \`login_code_hash\` varchar(64) NULL,
  ADD \`login_code_hint\` varchar(2) NULL,
  ADD \`proxy_epoch\` int NOT NULL DEFAULT 0
`);
      await queryRunner.query(`
ALTER TABLE \`users\`
  MODIFY \`login_code\` varchar(16) NULL
`);
      // Drop unique on plaintext if present (name varies); ignore failures.
      try {
        await queryRunner.query(
          `ALTER TABLE \`users\` DROP INDEX \`IDX_users_login_code\``,
        );
      } catch {
        /* ignore */
      }
      try {
        await queryRunner.query(
          `ALTER TABLE \`users\` DROP INDEX \`UQ_users_login_code\``,
        );
      } catch {
        /* ignore */
      }
      try {
        await queryRunner.query(
          `ALTER TABLE \`users\` DROP INDEX \`login_code\``,
        );
      } catch {
        /* ignore */
      }
    }

    const rows: Array<{ id: number; login_code: string | null }> =
      await queryRunner.query(
        `SELECT id, login_code FROM users WHERE login_code IS NOT NULL AND login_code != ''`,
      );
    for (const row of rows) {
      const code = String(row.login_code || '').trim();
      if (!/^\d{6,8}$/.test(code)) continue;
      const hash = hashLoginCode(code);
      const hint = code.slice(-2);
      const id = Number(row.id);
      if (!Number.isFinite(id) || !/^[a-f0-9]{64}$/.test(hash)) continue;
      await queryRunner.query(
        `UPDATE users SET login_code_hash = '${hash}', login_code_hint = '${hint}', login_code = NULL WHERE id = ${id}`,
      );
    }

    if (db === 'sqlite') {
      await queryRunner.query(
        `CREATE UNIQUE INDEX IF NOT EXISTS IDX_users_login_code_hash ON users(login_code_hash)`,
      );
    } else {
      await queryRunner.query(`
CREATE UNIQUE INDEX \`IDX_users_login_code_hash\` ON \`users\` (\`login_code_hash\`)
`);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const db = queryRunner.connection.options.type;
    if (db === 'sqlite') {
      await queryRunner.query(`DROP INDEX IF EXISTS IDX_users_login_code_hash`);
      // sqlite cannot cheaply drop columns
    } else {
      await queryRunner.query(
        `DROP INDEX \`IDX_users_login_code_hash\` ON \`users\``,
      );
      await queryRunner.query(`
ALTER TABLE \`users\`
  DROP COLUMN \`login_code_hash\`,
  DROP COLUMN \`login_code_hint\`,
  DROP COLUMN \`proxy_epoch\`
`);
    }
  }
}
