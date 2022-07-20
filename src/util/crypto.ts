const key = fetch('/api/pubkey').then(async res => {
  const buf = await res.arrayBuffer();
  return crypto.subtle.importKey('spki', buf, { name: 'RSA-OAEP', hash: 'SHA-256' }, false, ['encrypt']);
});

export async function encrypt(data: BufferSource) {
  const buf: ArrayBuffer = await crypto.subtle.encrypt({ name: 'RSA-OAEP' }, await key, data);
  return buf;
}