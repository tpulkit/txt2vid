import { EventEmitter } from "../sub";

export const lightTheme: Record<string, string> = {
  primary: '#1a73e8',
  // secondary: '#e539ff',
  // error: '#b00020',
  // background: '#212121',
  // surface: '#37474F',
  // onPrimary: 'rgba(255,255,255,.87)',
  // onSecondary: 'rgba(0,0,0,0.87)',
  // onSurface: 'rgba(255,255,255,.87)',
  // onError: '#fff',
  // textPrimaryOnBackground: 'rgba(255, 255, 255, 1)',
  // textSecondaryOnBackground: 'rgba(255, 255, 255, 0.7)',
  // textHintOnBackground: 'rgba(255, 255, 255, 0.5)',
  // textDisabledOnBackground: 'rgba(255, 255, 255, 0.5)',
  // textIconOnBackground: 'rgba(255, 255, 255, 0.5)',
  // textPrimaryOnLight: 'rgba(0, 0, 0, 0.87)',
  // textSecondaryOnLight: 'rgba(0, 0, 0, 0.54)',
  // textHintOnLight: 'rgba(0, 0, 0, 0.38)',
  // textDisabledOnLight: 'rgba(0, 0, 0, 0.38)',
  // textIconOnLight: 'rgba(0, 0, 0, 0.38)',
  // textPrimaryOnDark: 'white',
  // textSecondaryOnDark: 'rgba(255, 255, 255, 0.7)',
  // textHintOnDark: 'rgba(255, 255, 255, 0.5)',
  // textDisabledOnDark: 'rgba(255, 255, 255, 0.5)',
  // textIconOnDark: 'rgba(255, 255, 255, 0.5)'
};

export const darkTheme: Record<string, string> = {
  primary: '#24aee9',
  // secondary: '#e539ff',
  error: '#b00020',
  background: '#212121',
  surface: '#37474F',
  onPrimary: 'rgba(255,255,255,.87)',
  onSecondary: 'rgba(0,0,0,0.87)',
  onSurface: 'rgba(255,255,255,.87)',
  onError: '#fff',
  textPrimaryOnBackground: 'rgba(255, 255, 255, 1)',
  textSecondaryOnBackground: 'rgba(255, 255, 255, 0.7)',
  textHintOnBackground: 'rgba(255, 255, 255, 0.5)',
  textDisabledOnBackground: 'rgba(255, 255, 255, 0.5)',
  textIconOnBackground: 'rgba(255, 255, 255, 0.5)',
  textPrimaryOnLight: 'rgba(0, 0, 0, 0.87)',
  textSecondaryOnLight: 'rgba(0, 0, 0, 0.54)',
  textHintOnLight: 'rgba(0, 0, 0, 0.38)',
  textDisabledOnLight: 'rgba(0, 0, 0, 0.38)',
  textIconOnLight: 'rgba(0, 0, 0, 0.38)',
  textPrimaryOnDark: 'white',
  textSecondaryOnDark: 'rgba(255, 255, 255, 0.7)',
  textHintOnDark: 'rgba(255, 255, 255, 0.5)',
  textDisabledOnDark: 'rgba(255, 255, 255, 0.5)',
  textIconOnDark: 'rgba(255, 255, 255, 0.5)'
};

class ThemePreference extends EventEmitter<{ darkMode: boolean; }> {
  darkMode!: boolean;
  private pref: 'light' | 'dark' | 'system';
  private systemMode: boolean;
  constructor() {
    super();
    this.pref = (localStorage.getItem('forceDarkMode') || 'system') as 'light' | 'dark' | 'system';
    const match = matchMedia('(prefers-color-scheme: dark)');
    this.systemMode = match.matches;
    match.addEventListener('change', evt => {
      this.systemMode = evt.matches;
      if (this.pref == 'system') {
        this.darkMode = this.systemMode;
        this.emit('darkMode', this.darkMode);
      }
    });
    this.updateMode();
  }
  get preference() {
    return this.pref;
  }
  set preference(preference: 'light' | 'dark' | 'system') {
    this.pref = preference;
    localStorage.setItem('forceDarkMode', preference);
    const oldMode = this.darkMode;
    this.updateMode();
    if (oldMode !== this.darkMode) this.emit('darkMode', this.darkMode);
  }
  private updateMode() {
    this.darkMode = this.preference == 'dark' || (this.preference == 'system' && this.systemMode);
  }
}

export const themePreference = new ThemePreference();