import fetch from 'node-fetch';

export type BaseResponse = { success: true } | { success: false; message: string; }

export async function request<T>(
  path: string,
  method: 'GET' | 'PUT' | 'PATCH' | 'POST' | 'DELETE',
  apiKey: string,
  body: unknown
): Promise<T & BaseResponse> {
  const res = await fetch(`https://app.resemble.ai/api/v2${path}`, {
    method,
    headers: {
      Authorization: `Token token=${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });
  return res.json();
};