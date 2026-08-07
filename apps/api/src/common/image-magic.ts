import { openSync, readSync, closeSync, unlinkSync } from 'fs';

export type ImageKind = 'jpeg' | 'png' | 'gif' | 'webp';

/** Detect image type from file magic bytes (first ~12 bytes). */
export function detectImageKind(buf: Buffer): ImageKind | null {
  if (buf.length < 3) return null;
  // JPEG
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpeg';
  // PNG
  if (
    buf.length >= 8 &&
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47 &&
    buf[4] === 0x0d &&
    buf[5] === 0x0a &&
    buf[6] === 0x1a &&
    buf[7] === 0x0a
  ) {
    return 'png';
  }
  // GIF
  if (
    buf.length >= 6 &&
    buf[0] === 0x47 &&
    buf[1] === 0x49 &&
    buf[2] === 0x46 &&
    buf[3] === 0x38 &&
    (buf[4] === 0x37 || buf[4] === 0x39) &&
    buf[5] === 0x61
  ) {
    return 'gif';
  }
  // WEBP: RIFF....WEBP
  if (
    buf.length >= 12 &&
    buf[0] === 0x52 &&
    buf[1] === 0x49 &&
    buf[2] === 0x46 &&
    buf[3] === 0x46 &&
    buf[8] === 0x57 &&
    buf[9] === 0x45 &&
    buf[10] === 0x42 &&
    buf[11] === 0x50
  ) {
    return 'webp';
  }
  return null;
}

/** Read header from disk path; returns kind or null. */
export function detectImageKindFromPath(filePath: string): ImageKind | null {
  const fd = openSync(filePath, 'r');
  try {
    const buf = Buffer.alloc(16);
    const n = readSync(fd, buf, 0, 16, 0);
    return detectImageKind(buf.subarray(0, n));
  } finally {
    closeSync(fd);
  }
}

/** If not a real image, delete the file and return false. */
export function assertUploadedImageOrCleanup(filePath: string): boolean {
  const kind = detectImageKindFromPath(filePath);
  if (kind) return true;
  try {
    unlinkSync(filePath);
  } catch {
    /* ignore */
  }
  return false;
}
