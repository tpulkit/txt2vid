import createState, { StateBackend } from 'react-universal-state';
import { themePreference } from './ui';

class PartialPersistence<T extends Record<string, unknown>> implements StateBackend<T> {
  private state: Partial<T>;
  constructor(private blacklist: (keyof T)[], private name = 'globalState') {
    const cached = localStorage.getItem(name);
    if (cached) this.state = JSON.parse(cached);
    else this.state = {};
  }
  private persist() {
    const filtered: Partial<T> = {};
    for (const k in this.state) {
      if (this.blacklist.includes(k)) continue;
      filtered[k] = this.state[k];
    }
    localStorage.setItem(this.name, JSON.stringify(filtered));
  }
  get<K extends keyof T>(k: K): T[K] {
    return this.state[k]!;
  }
  set<K extends keyof T>(k: K, v: T[K]) {
    this.state[k] = v;
    this.persist();
  }
}

const defaults = {
  ttsID: '',
  resemble: {
    project: '',
    voice: ''
  },
  av: {mic: '', cam: ''},
  username: 'Guest' + Math.floor(Math.random() * 1000000).toString().padStart(6, '0'),
  showSettings: false,
  darkMode: themePreference.darkMode
};

const { hook: useGlobalState } = createState(
  defaults,
  new PartialPersistence<typeof defaults>(['showSettings', 'darkMode'])
);

export { useGlobalState };