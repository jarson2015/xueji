import { createHmac } from 'crypto';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { generateNumericLoginCode } from './upload-url';
import { resolveJwtSecret } from './jwt-secret';

/** Login codes expire after 14 days; parents can refresh anytime. */
const CODE_TTL_DAYS = 14;

/** New codes are 8 digits; login still accepts legacy 6-digit during migration. */
export const LOGIN_CODE_LENGTH = 8;
export const LOGIN_CODE_MIN_LENGTH = 6;
export const LOGIN_CODE_MAX_LENGTH = 8;

export function generateLoginCode(): string {
  return generateNumericLoginCode(LOGIN_CODE_LENGTH);
}

export function loginCodeExpiry(from = new Date()): Date {
  const d = new Date(from);
  d.setDate(d.getDate() + CODE_TTL_DAYS);
  return d;
}

export function normalizeLoginCodeInput(raw: string): string {
  return String(raw || '')
    .trim()
    .replace(/\D/g, '')
    .slice(0, LOGIN_CODE_MAX_LENGTH);
}

export function isValidLoginCodeFormat(code: string): boolean {
  return new RegExp(
    `^\\d{${LOGIN_CODE_MIN_LENGTH},${LOGIN_CODE_MAX_LENGTH}}$`,
  ).test(code);
}

/** HMAC-SHA256 of login code; secret tied to JWT_SECRET so dumps alone are useless. */
export function hashLoginCode(code: string, secret?: string): string {
  const key = resolveJwtSecret(secret ?? process.env.JWT_SECRET);
  return createHmac('sha256', key).update(`login-code:${code}`).digest('hex');
}

export function loginCodeHint(code: string): string {
  const digits = normalizeLoginCodeInput(code);
  return digits.slice(-2);
}

export type AssignedLoginCode = {
  loginCode: string;
  loginCodeHash: string;
  loginCodeHint: string;
  loginCodeExpiresAt: Date;
};

export async function assignUniqueLoginCode(
  users: Repository<User>,
  preferred?: string,
): Promise<AssignedLoginCode> {
  const expires = loginCodeExpiry();
  const tryCode = async (code: string): Promise<AssignedLoginCode | null> => {
    if (!isValidLoginCodeFormat(code)) return null;
    const loginCodeHash = hashLoginCode(code);
    const taken = await users.findOne({ where: { loginCodeHash } });
    if (taken) return null;
    return {
      loginCode: code,
      loginCodeHash,
      loginCodeHint: loginCodeHint(code),
      loginCodeExpiresAt: expires,
    };
  };

  if (preferred) {
    const hit = await tryCode(normalizeLoginCodeInput(preferred));
    if (hit) return hit;
  }
  for (let i = 0; i < 30; i++) {
    const hit = await tryCode(generateLoginCode());
    if (hit) return hit;
  }
  throw new Error('无法生成唯一登录码');
}
