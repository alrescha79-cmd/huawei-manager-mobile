/**
 * Huawei LTE modem API error handling.
 *
 * Error codes 125002/125003 mean the modem session expired and the user
 * must re-login. The modem reports them both as `<code>N</code>` inside
 * an XML `<error>` body and, after `ModemAPIClient.get()/post()` throw,
 * embedded in the error message string.
 */

export const SESSION_EXPIRED_CODES = ['125002', '125003'] as const;

export function hasSessionExpiredCode(xml: string): boolean {
  return SESSION_EXPIRED_CODES.some((code) => xml.includes(`<code>${code}</code>`));
}

export function isSessionExpiredError(error: unknown): boolean {
  if (!error) return false;
  const message = error instanceof Error ? error.message : String(error);
  return SESSION_EXPIRED_CODES.some((code) => message.includes(code));
}

export function parseErrorCode(xml: string): string {
  return xml.match(/<code>(\d+)<\/code>/)?.[1] || '';
}
