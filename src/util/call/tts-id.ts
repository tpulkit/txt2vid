import { encrypt } from '../crypto';
import { strFromU8, strToU8 } from 'fflate';

export async function createTTSID(projectID: string, voiceID: string, apiKey: string) {
  const encrypted = await encrypt(strToU8(apiKey));
  const encoded = btoa(strFromU8(new Uint8Array(encrypted), true))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  return `${projectID}.${voiceID}.${encoded}`;
}