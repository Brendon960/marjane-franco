import { createHash, randomBytes } from 'node:crypto';

/** Token aleatório seguro para URL/cookie (base64url). */
export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString('base64url');
}

/** Hash SHA-256 em hex — é o que vai para o banco no lugar do token. */
export function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}
