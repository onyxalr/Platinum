import crypto from 'node:crypto';

const SCRYPT_N = 16384;
const KEYLEN = 64;
const SESSION_TTL = 1000 * 60 * 60 * 24 * 30;

export function hashPassword(password: string): { hash: string; salt: string } {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, KEYLEN, { N: SCRYPT_N }).toString('hex');
  return { hash, salt };
}

export function verifyPassword(password: string, salt: string, expected: string): boolean {
  try {
    const actual = crypto.scryptSync(password, salt, KEYLEN, { N: SCRYPT_N });
    const expectedBuf = Buffer.from(expected, 'hex');
    if (actual.length !== expectedBuf.length) return false;
    return crypto.timingSafeEqual(actual, expectedBuf);
  } catch {
    return false;
  }
}

export function newToken(): { token: string; hash: string } {
  const token = crypto.randomBytes(32).toString('base64url');
  return { token, hash: hashToken(token) };
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export const sessionTtl = SESSION_TTL;

export function validateUsername(username: string): string | null {
  const value = username.trim();
  if (value.length < 3) return 'Имя пользователя — минимум 3 символа';
  if (value.length > 24) return 'Имя пользователя — максимум 24 символа';
  if (!/^[\p{L}\p{N}_.-]+$/u.test(value)) return 'Только буквы, цифры, точка, дефис и подчёркивание';
  return null;
}

export function validatePassword(password: string): string | null {
  if (password.length < 6) return 'Пароль — минимум 6 символов';
  if (password.length > 200) return 'Слишком длинный пароль';
  return null;
}
