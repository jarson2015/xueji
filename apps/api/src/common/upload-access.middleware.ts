import { Request, Response, NextFunction } from 'express';
import { join, basename } from 'path';
import { existsSync } from 'fs';
import { verifyUploadAccess } from './upload-url';

/**
 * Serve `/uploads/:file` only when `?exp=&sig=` HMAC is valid.
 * Replaces open `useStaticAssets` for child proof photos.
 */
export function createUploadAccessMiddleware(uploadDir: string) {
  const root = join(process.cwd(), uploadDir);
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.status(405).end();
      return;
    }
    const file = basename(req.path || '');
    if (!file || file === '.' || file === '..') {
      res.status(400).end();
      return;
    }
    const pathname = `/uploads/${file}`;
    const exp = typeof req.query.exp === 'string' ? req.query.exp : undefined;
    const sig = typeof req.query.sig === 'string' ? req.query.sig : undefined;
    if (!verifyUploadAccess(pathname, exp, sig)) {
      res.status(401).json({
        code: 401,
        message: '图片链接无效或已过期，请刷新页面后重试',
        data: null,
      });
      return;
    }
    const full = join(root, file);
    if (!full.startsWith(root) || !existsSync(full)) {
      res.status(404).end();
      return;
    }
    res.sendFile(full, (err) => {
      if (err && !res.headersSent) next(err);
    });
  };
}
