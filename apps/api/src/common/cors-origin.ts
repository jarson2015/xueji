/** Shared CORS origin resolution — never reflect arbitrary Origin in production. */
export function resolveCorsOrigin(): boolean | string[] {
  const raw = (process.env.CORS_ORIGIN || '').trim();
  const nodeEnv = (process.env.NODE_ENV || 'development').toLowerCase();
  const isProd = nodeEnv === 'production';
  if (raw) {
    return raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }
  if (isProd) {
    throw new Error(
      'CORS_ORIGIN must be set to your frontend origin(s) when NODE_ENV=production (comma-separated)',
    );
  }
  return true;
}
