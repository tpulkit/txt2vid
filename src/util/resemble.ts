type BaseResponse = { success: true } | { success: false; message: string; }

async function request<T>(
  path: string,
  method: 'GET' | 'PUT' | 'PATCH' | 'POST' | 'DELETE',
  apiKey: string,
  body?: unknown,
  signal?: AbortSignal
): Promise<T & BaseResponse> {
  const init: RequestInit = {
    method,
    headers: {
      Authorization: `Token token=${apiKey}`
    },
    signal
  };
  if (body) {
    init.body = JSON.stringify(body);
    (init.headers as Record<string, string>)['Content-Type'] = 'application/json';
  }
  const res = await fetch(`https://app.resemble.ai/api/v2${path}`, init);
  return res.json();
};

export type ResembleProject = { id: string; name: string; }

export async function getProjects(apiKey: string, signal?: AbortSignal) {
  let projects: ResembleProject[] = [];
  let page = 1;
  while (true) {
    const res = await request<{ page: number; num_pages: number; items: { uuid: string; name: string; }[] }>(
      `/projects?page=${page}&page_size=1000`,'GET', apiKey, signal
    );
    if (!res.success) {
      throw new Error(res.message);
    }
    projects = projects.concat(res.items.map(({ uuid, name }) => ({ id: uuid, name })));
    if (res.page == res.num_pages) break;
  }
  return projects;
}

export type ResembleVoice = { id: string; name: string; }

export async function getVoices(apiKey: string, signal?: AbortSignal) {
  let voices: ResembleProject[] = [];
  let page = 1;
  while (true) {
    const res = await request<{ page: number; num_pages: number; items: { uuid: string; name: string; }[] }>(
      `/voices?page=${page}&page_size=1000`,'GET', apiKey, signal
    );
    if (!res.success) {
      throw new Error(res.message);
    }
    voices = voices.concat(res.items.map(({ uuid, name }) => ({ id: uuid, name })));
    if (res.page == res.num_pages) break;
  }
  return voices;
}