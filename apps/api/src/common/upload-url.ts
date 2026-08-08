import { BadRequestException } from '@nestjs/common';
import { createHmac, timingSafeEqual, randomInt } from 'crypto';
import { resolveJwtSecret } from './jwt-secret';

/** Signed upload URL lifetime (1h) — bound to viewer uid. */
export const UPLOAD_URL_TTL_SEC = 60 * 60;

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

function normalizeViewerId(viewerId?: number | null): number | null {
  const uid = Number(viewerId);
  if (!Number.isFinite(uid) || uid <= 0) return null;
  return Math.floor(uid);
}

/**
 * HMAC capability URL bound to viewer id (`uid` query).
 * Without viewerId returns bare path (GET will 401) — never mint unbound sigs.
 */
export function signUploadPath(
  pathOrUrl: string,
  ttlSec = UPLOAD_URL_TTL_SEC,
  nowSec = Math.floor(Date.now() / 1000),
  viewerId?: number | null,
): string {
  const path = normalizeUploadPath(pathOrUrl);
  if (!path) return pathOrUrl;
  const uid = normalizeViewerId(viewerId);
  if (uid == null) return path;
  const exp = nowSec + ttlSec;
  const sig = createHmac('sha256', uploadSigningSecret())
    .update(`${path}.${exp}.${uid}`)
    .digest('hex');
  return `${path}?exp=${exp}&uid=${uid}&sig=${sig}`;
}

export function verifyUploadAccess(
  pathname: string,
  expRaw: string | undefined,
  sigRaw: string | undefined,
  uidRaw?: string | undefined,
): boolean {
  const path = normalizeUploadPath(
    pathname.startsWith('/uploads/') ? pathname : `/uploads/${pathname}`,
  );
  if (!path) return false;
  const exp = Number(expRaw);
  if (!Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) return false;
  const uid = normalizeViewerId(uidRaw == null ? null : Number(uidRaw));
  if (uid == null) return false;
  if (!sigRaw || !/^[a-f0-9]{64}$/i.test(sigRaw)) return false;
  const expected = createHmac('sha256', uploadSigningSecret())
    .update(`${path}.${exp}.${uid}`)
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

/** Walk JSON-like values and sign bare `/uploads/...` strings for this viewer. */
export function signUploadUrlsInData<T>(
  data: T,
  viewerId?: number | null,
): T {
  return walk(data, normalizeViewerId(viewerId)) as T;
}

function walk(value: unknown, viewerId: number | null): unknown {
  if (typeof value === 'string') {
    if (value.startsWith('/uploads/') && !value.includes('sig=')) {
      return signUploadPath(value, UPLOAD_URL_TTL_SEC, undefined, viewerId);
    }
    return value;
  }
  if (Array.isArray(value)) return value.map((v) => walk(v, viewerId));
  if (value && typeof value === 'object' && value.constructor === Object) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = walk(v, viewerId);
    }
    return out;
  }
  return value;
}

/** Digits-only login code; default 8 for higher entropy (was 6). */
export function generateNumericLoginCode(length = 8): string {
  const len = Math.min(12, Math.max(4, Math.floor(length)));
  const min = 10 ** (len - 1);
  const max = 10 ** len;
  return String(randomInt(min, max));
}

export function randomInviteAlphabetCode(length = 6): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < length; i++) {
    code += alphabet[randomInt(0, alphabet.length)];
  }
  return code;
}
