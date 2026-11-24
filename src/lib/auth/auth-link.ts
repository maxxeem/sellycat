/** Link of an auth mail: redeemed on /auth/continue, in whatever browser it is opened. */
export function authLink(site: string, tokenHash: string, type: string, next: string): string {
  return `${site}/auth/continue?${new URLSearchParams({ token_hash: tokenHash, type, next })}`;
}
