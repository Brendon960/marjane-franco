import { hash, verify } from '@node-rs/argon2';
import { randomInt } from 'node:crypto';

// argon2id com os parâmetros recomendados pela OWASP (19 MiB, 2 iterações).
const OPTIONS = { memoryCost: 19_456, timeCost: 2, parallelism: 1 } as const;

export const hashPassword = (password: string) => hash(password, OPTIONS);

/** Hash de uma senha qualquer, usado para gastar o mesmo tempo quando o e-mail não existe. */
let dummyHash: Promise<string> | undefined;

export async function verifyPassword(passwordHash: string | null, password: string): Promise<boolean> {
  try {
    return await verify(passwordHash ?? (await (dummyHash ??= hashPassword('senha-inexistente-0'))), password);
  } catch {
    return false;
  }
}

/** Senha provisória legível (sem caracteres ambíguos), com letras e números. */
export function generateTemporaryPassword(length = 14): string {
  const letters = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ';
  const digits = '23456789';
  const all = letters + digits;
  const chars = [letters[randomInt(letters.length)]!, digits[randomInt(digits.length)]!];
  while (chars.length < length) chars.push(all[randomInt(all.length)]!);
  // embaralha para a letra e o dígito garantidos não ficarem sempre no início
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j]!, chars[i]!];
  }
  return chars.join('');
}
