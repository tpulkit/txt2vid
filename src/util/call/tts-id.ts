import { encrypt, isNewKey } from '../crypto';
import { serialize } from '../data';
import { strToU8 } from 'fflate';

export async function createTTSID(projectID: string, voiceID: string, apiKey: string) {
  const encrypted = new Uint8Array(await encrypt(strToU8(apiKey)));
  return `${projectID}.${voiceID}.${serialize(encrypted)}`;
}

export function needsNewID() {
  return isNewKey();
}