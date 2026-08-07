import { BadRequestException } from '@nestjs/common';
import { createHmac, timingSafeEqual, randomInt } from 'crypto';
import { resolveJwtSecret } from './jwt-secret';

/** Default signed upload URL lifetime (2h) — enough for a board session. */
export const UPLOAD_URL_TTL_SEC = 2 * 60 * 60;

export function uploadSigningSecret(): string {
  return resolveJwtSecret(process.env.JWT_SECRET);
}

/** Strip query/hash; keep `/uploads/filename` only. */
export function normalizeUploadPath(url: string): string | null {
  const raw = String(url || '').trim();
  if (!raw.startsWith('/uploads/')) return null;
  const pathOnly = raw.split('?')[0].split('#')[0];
  if (pathOnly.includes('..') || pathOnly.includes('\\')) return null;
  const name = pathOnly.slice('/uploads/'.length);
  if (!name || name.includes('/')) return null;
  return `/uploads/${name}`;
}

/**
 * Defense-in-depth for persisted image/cover URLs.
 * Prefer calling this in services even when DTO already @Matches.
 */
export function requireSafeUploadPath(
  url: string,
  message = '图片地址无效，请先上传',
): string {
  const path = normalizeUploadPath(url);
  if (!path) {
    throw new BadRequestException(message);
  }
  return path;
}

export function signUploadPath(
  pathOrUrl: string,
  ttlSec = UPLOAD_URL_TTL_SEC,
  nowSec = Math.floor(Date.now() / 1000),
): string {
  const path = normalizeUploadPath(pathOrUrl);
  if (!path) return pathOrUrl;
  const exp = nowSec + ttlSec;
  const sig = createHmac('sha256', uploadSigningSecret())
    .update(`${path}.${exp}`)
    .digest('hex');
  return `${path}?exp=${exp}&sig=${sig}`;
}

export function verifyUploadAccess(
  pathname: string,
  expRaw: string | undefined,
  sigRaw: string | undefined,
): boolean {
  const path = normalizeUploadPath(pathname.startsWith('/uploads/') ? pathname : `/uploads/${pathname}`);
  if (!path) return false;
  const exp = Number(expRaw);
  if (!Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) return false;
  if (!sigRaw || !/^[a-f0-9]{64}$/i.test(sigRaw)) return false;
  const expected = createHmac('sha256', uploadSigningSecret())
    .update(`${path}.${exp}`)
    .digest('hex');
  try {
    const a = Buffer.from(expected, 'hex');
    const b = Buffer.from(sigRaw, 'hex');
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/** Walk JSON-like values and sign bare `/uploads/...` strings. */
export function signUploadUrlsInData<T>(data: T): T {
  return walk(data) as T;
}

function walk(value: unknown): unknown {
  if (typeof value === 'string') {
    if (value.startsWith('/uploads/') && !value.includes('sig=')) {
      return signUploadPath(value);
    }
    return value;
  }
  if (Array.isArray(value)) return value.map(walk);
  if (value && typeof value === 'object' && value.constructor === Object) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = walk(v);
    }
    return out;
  }
  return value;
}

export function generateNumericLoginCode(): string {
  return String(randomInt(100000, 1000000));
}

export function randomInviteAlphabetCode(length = 6): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < length; i++) {
    code += alphabet[randomInt(0, alphabet.length)];
  }
  return code;
}
