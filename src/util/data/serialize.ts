import { strToU8, strFromU8 } from 'fflate';

export function serialize(buf: Uint8Array) {
  return btoa(strFromU8(buf, true))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export function deserialize(src: string) {
  return strToU8(
    atob(src.replace(/-/g, '+').replace(/_/g, '\\')),
    true
  );
}