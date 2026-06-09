import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const THEMES = {
  cyberpunk: {
    name: 'Cyberpunk',
    accent: '#00e5cc',
    accentHover: '#00b8a3',
    bg: '#06080f',
    bgLight: '#0c1018',
    surface: '#111620',
    text: '#d0f5f0',
    textDim: '#4a8a80',
    border: '#1a2a28',
    danger: '#ff4466',
    warning: '#ffcc00',
    success: '#00e5cc',
    info: '#66ddff',
    mapTheme: 'dark',
  },
  matrix: {
    name: 'Matrix',
    accent: '#00ff41',
    accentHover: '#00cc33',
    bg: '#000000',
    bgLight: '#040804',
    surface: '#080e08',
    text: '#ccffcc',
    textDim: '#338833',
    border: '#113311',
    danger: '#ff3355',
    warning: '#ccff00',
    success: '#00ff41',
    info: '#44ddaa',
    mapTheme: 'dark',
  },
  synthwave: {
    name: 'Synthwave',
    accent: '#ff00ff',
    accentHover: '#cc00cc',
    bg: '#0a0010',
    bgLight: '#12001a',
    surface: '#1a0025',
    text: '#ffd6ff',
    textDim: '#884488',
    border: '#330044',
    danger: '#ff4488',
    warning: '#ffcc00',
    success: '#ff66dd',
    info: '#dd88ff',
    mapTheme: 'dark',
  },
  light: {
    name: 'Light Mode',
    accent: '#2563eb',
    accentHover: '#1d4ed8',
    bg: '#eef2ff',
    bgLight: '#e4eaff',
    surface: '#ffffff',
    text: '#0a1a3a',
    textDim: '#3366aa',
    border: '#b0c4f0',
    danger: '#cc2222',
    warning: '#cc8800',
    success: '#007755',
    info: '#2563eb',
    mapTheme: 'light',
  },
  sunset: {
    name: 'Sunset',
    accent: '#ff6b35',
    accentHover: '#e55a2b',
    bg: '#0a0500',
    bgLight: '#150a00',
    surface: '#201000',
    text: '#ffe0cc',
    textDim: '#996633',
    border: '#442200',
    danger: '#ff4466',
    warning: '#ffcc00',
    success: '#88ff66',
    info: '#88ccff',
    mapTheme: 'dark',
  },
};

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => {
    try {
      return localStorage.getItem('eo_theme') || 'cyberpunk';
    } catch {
      return 'cyberpunk';
    }
  });

  const setTheme = useCallback((name) => {
    setThemeState(name);
    try {
      localStorage.setItem('eo_theme', name);
    } catch {}
  }, []);

  const currentTheme = THEMES[theme] || THEMES.cyberpunk;

  useEffect(() => {
    const root = document.documentElement;
    const t = currentTheme;
    root.style.setProperty('--accent-color', t.accent);
    root.style.setProperty('--accent-hover', t.accentHover);
    root.style.setProperty('--bg-color', t.bg);
    root.style.setProperty('--bg-light', t.bgLight);
    root.style.setProperty('--surface-color', t.surface);
    root.style.setProperty('--panel-bg', t.surface);
    root.style.setProperty('--text-color', t.text);
    root.style.setProperty('--text-dim', t.textDim);
    root.style.setProperty('--border-color', t.border);
    root.style.setProperty('--danger-color', t.danger);
    root.style.setProperty('--warning-color', t.warning);
    root.style.setProperty('--success-color', t.success);
    root.style.setProperty('--info-color', t.info);
    root.style.setProperty('--text-primary', t.text);
    root.style.setProperty('--text-secondary', t.textDim);
    root.style.setProperty('--text-main', t.text);
  }, [currentTheme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, themeData: currentTheme, themes: THEMES }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
