import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const THEMES = {
  cyberpunk: {
    name: 'Cyberpunk',
    accent: '#00ff41',
    accentHover: '#00cc34',
    bg: '#0a0e17',
    bgLight: '#0f172a',
    surface: '#161d2e',
    text: '#e2e8f0',
    textDim: '#64748b',
    border: '#1e293b',
    danger: '#ef4444',
    warning: '#f59e0b',
    success: '#10b981',
    info: '#3b82f6',
    mapTheme: 'dark',
  },
  matrix: {
    name: 'Matrix',
    accent: '#00ff41',
    accentHover: '#00cc34',
    bg: '#000000',
    bgLight: '#0a0a0a',
    surface: '#111111',
    text: '#00ff41',
    textDim: '#008800',
    border: '#003300',
    danger: '#ff0044',
    warning: '#ffaa00',
    success: '#00ff41',
    info: '#0088ff',
    mapTheme: 'dark',
  },
  synthwave: {
    name: 'Synthwave',
    accent: '#ff00ff',
    accentHover: '#cc00cc',
    bg: '#1a0033',
    bgLight: '#240044',
    surface: '#2d0055',
    text: '#e0aaff',
    textDim: '#8844aa',
    border: '#440066',
    danger: '#ff0044',
    warning: '#ffaa00',
    success: '#00ffaa',
    info: '#00ccff',
    mapTheme: 'dark',
  },
  light: {
    name: 'Light Mode',
    accent: '#2563eb',
    accentHover: '#1d4ed8',
    bg: '#f8fafc',
    bgLight: '#f1f5f9',
    surface: '#ffffff',
    text: '#1e293b',
    textDim: '#94a3b8',
    border: '#e2e8f0',
    danger: '#dc2626',
    warning: '#d97706',
    success: '#059669',
    info: '#2563eb',
    mapTheme: 'light',
  },
  sunset: {
    name: 'Sunset',
    accent: '#ff6b35',
    accentHover: '#e55a2b',
    bg: '#1a0a00',
    bgLight: '#2a1500',
    surface: '#3a2000',
    text: '#ffd6b0',
    textDim: '#cc8844',
    border: '#553300',
    danger: '#ff0044',
    warning: '#ffaa00',
    success: '#44ff88',
    info: '#44aaff',
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
    root.style.setProperty('--accent-hover', t.accentHover);
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
