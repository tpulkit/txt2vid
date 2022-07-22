import { webcrypto } from 'crypto';
import { existsSync } from 'fs';
import { resolve } from 'path';
import { readFile, writeFile } from 'fs/promises';

const crypto = (webcrypto as unknown as Crypto);
const KEYS_PATH = resolve(__dirname, '..', 'keys.json');
const keypair = loadKeys();

async function loadKeys() {
  if (!existsSync(KEYS_PATH)) {
    const keys = await crypto.subtle.generateKey({
      name: 'RSA-OAEP',
      hash: 'SHA-256',
      modulusLength: 4096,
      publicExponent: new Uint8Array([1, 0, 1]),
    }, true, ['decrypt']);
    const priv = await crypto.subtle.exportKey('jwk', keys.privateKey);
    const pub = await crypto.subtle.exportKey('jwk', keys.publicKey);
    await writeFile(KEYS_PATH, JSON.stringify({ priv, pub }));
    return keys;
  }
  const { priv, pub } = JSON.parse(await readFile(KEYS_PATH, 'utf8')) as { priv: JsonWebKey, pub: JsonWebKey };
  return {
    privateKey: await crypto.subtle.importKey('jwk', priv, { name: 'RSA-OAEP', hash: 'SHA-256' }, false, ['decrypt']),
    publicKey: await crypto.subtle.importKey('jwk', pub, { name: 'RSA-OAEP', hash: 'SHA-256' }, true, []),
  };
}

export async function decrypt(data: Buffer) {
  const { privateKey } = await keypair;
  const buf: ArrayBuffer = await crypto.subtle.decrypt({ name: 'RSA-OAEP' }, privateKey, data);
  return Buffer.from(buf);
}

const nonceBuf = Buffer.alloc(8);

export function createNonce() {
  return crypto.getRandomValues(nonceBuf).toString('hex');
}

export const key = keypair
  .then(({ publicKey }) => crypto.subtle.exportKey('spki', publicKey))
  .then(buf => Buffer.from(buf));