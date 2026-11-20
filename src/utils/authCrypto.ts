/**
 * Web Crypto API SHA-256 password hashing and verification helper for Meridian Audit.
 */
export function generateSalt(): string {
  const array = new Uint8Array(16);
  window.crypto.getRandomValues(array);
  return Array.from(array)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function hashPassword(password: string, salt: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(`${salt}:${password}`);
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function verifyPassword(
  password: string,
  salt: string,
  expectedHash: string
): Promise<boolean> {
  if (
    !password ||
    !salt ||
    !expectedHash ||
    typeof expectedHash !== 'string' ||
    expectedHash.length !== 64
  ) {
    return false;
  }
  const computedHash = await hashPassword(password, salt);
  return computedHash === expectedHash;
}
