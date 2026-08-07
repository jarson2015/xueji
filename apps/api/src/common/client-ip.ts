/**
 * Client IP for rate limits.
 * Do NOT read X-Forwarded-For unless Express trust proxy is enabled
 * (TRUST_PROXY=1 in main.ts) — otherwise clients can spoof the header.
 */
export function clientIp(req: {
  ip?: string;
  socket?: { remoteAddress?: string };
}): string {
  const raw =
    (typeof req.ip === 'string' && req.ip) ||
    req.socket?.remoteAddress ||
    '';
  if (!raw) return 'unknown';
  // Express may give IPv6-mapped IPv4 ":ffff:1.2.3.4"
  return raw.replace(/^::ffff:/i, '');
}
