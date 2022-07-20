import { webcrypto } from 'crypto';

const crypto = (webcrypto as unknown as Crypto);

const keypair = crypto.subtle.generateKey({
  name: 'RSA-OAEP',
  hash: 'SHA-256',
  modulusLength: 4096,
  publicExponent: new Uint8Array([1, 0, 1]),
}, true, ['decrypt']);

export async function decrypt(data: Buffer) {
  const { privateKey } = await keypair;
  const buf: ArrayBuffer = await crypto.subtle.decrypt({ name: 'RSA-OAEP' }, privateKey, data);
  return Buffer.from(buf);
}

export function createNonce() {
  return crypto.randomUUID();
}

export const key = keypair
  .then(({ publicKey }) => crypto.subtle.exportKey('spki', publicKey))
  .then(buf => Buffer.from(buf));