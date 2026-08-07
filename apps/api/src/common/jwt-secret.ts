/** Resolve JWT secret; refuse weak defaults outside development */
export function resolveJwtSecret(raw?: string | null): string {
  const secret = (raw || '').trim();
  const nodeEnv = (process.env.NODE_ENV || 'development').toLowerCase();
  const isProd = nodeEnv === 'production';
  const knownWeak = new Set([
    '',
    'dev-secret',
    'study-checkin-dev-secret-change-me',
    'study-checkin-compose-demo-secret-32chars',
    'secret',
    'jwt-secret',
  ]);
  const weak = knownWeak.has(secret) || secret.length < 24;

  if (isProd && weak) {
    throw new Error(
      'JWT_SECRET must be a strong unique value (min 24 chars) when NODE_ENV=production',
    );
  }
  return secret || 'dev-secret';
}
