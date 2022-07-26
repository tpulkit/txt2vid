import { serialize } from './data';

const rawKey = fetch('/api/pubkey').then(res => res.arrayBuffer());

const key = rawKey.then(buf => 
  crypto.subtle.importKey(
    'spki',
    buf,
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    false,
    ['encrypt']
  )
);

export async function isNewKey() {
  const newKey = serialize(new Uint8Array(await rawKey));
  const oldKey = localStorage.getItem('pubkey');
  if (newKey == oldKey) return false;
  localStorage.setItem('pubkey', newKey);
  return true;
}

export async function encrypt(data: BufferSource) {
  const buf: ArrayBuffer = await crypto.subtle.encrypt({ name: 'RSA-OAEP' }, await key, data);
  return buf;
}