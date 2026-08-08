/**
 * Student JWT session epoch (`pe` claim vs users.proxy_epoch).
 * Bumped on login-code refresh and student password change.
 */
export function studentSessionEpochOk(
  tokenPe: number | undefined | null,
  dbEpoch: number | undefined | null,
): boolean {
  return (tokenPe ?? 0) === (dbEpoch || 0);
}
