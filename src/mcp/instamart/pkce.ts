import { createHash, randomBytes } from 'crypto';

/**
 * OAuth 2.1 PKCE (RFC 7636) helper. Swiggy's MCP auth server only supports the
 * S256 code_challenge_method (see /.well-known/oauth-authorization-server).
 */
export interface PkcePair {
  codeVerifier: string;
  codeChallenge: string;
}

function base64UrlEncode(buffer: Buffer): string {
  return buffer.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function generatePkcePair(): PkcePair {
  const codeVerifier = base64UrlEncode(randomBytes(32));
  const codeChallenge = base64UrlEncode(createHash('sha256').update(codeVerifier).digest());

  return { codeVerifier, codeChallenge };
}
