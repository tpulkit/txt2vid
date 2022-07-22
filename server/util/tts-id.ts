import { decrypt } from './crypto';

export async function parseTTSID(id: string) {
  const [projectID, voiceID, encodedApiKey] = id.split('.');
  const apiKey = (await decrypt(Buffer.from(encodedApiKey, 'base64url'))).toString('latin1');
  return { projectID, voiceID, apiKey };
};