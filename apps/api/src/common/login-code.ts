import { User } from '../entities/user.entity';
import { Repository } from 'typeorm';
import { generateNumericLoginCode } from './upload-url';

/** Login codes expire after 14 days; parents can refresh anytime. */
const CODE_TTL_DAYS = 14;

export function generateLoginCode(): string {
  return generateNumericLoginCode();
}

export function loginCodeExpiry(from = new Date()): Date {
  const d = new Date(from);
  d.setDate(d.getDate() + CODE_TTL_DAYS);
  return d;
}

export async function assignUniqueLoginCode(
  users: Repository<User>,
  preferred?: string,
): Promise<{ loginCode: string; loginCodeExpiresAt: Date }> {
  const expires = loginCodeExpiry();
  if (preferred && /^\d{6}$/.test(preferred)) {
    const taken = await users.findOne({ where: { loginCode: preferred } });
    if (!taken) return { loginCode: preferred, loginCodeExpiresAt: expires };
  }
  for (let i = 0; i < 20; i++) {
    const code = generateLoginCode();
    const taken = await users.findOne({ where: { loginCode: code } });
    if (!taken) return { loginCode: code, loginCodeExpiresAt: expires };
  }
  throw new Error('无法生成唯一登录码');
}
