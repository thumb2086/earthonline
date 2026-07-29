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
  ocean: {
    name: 'Ocean',
    accent: '#00d4ff',
    accentHover: '#00b8e6',
    bg: '#001a2e',
    bgLight: '#002a45',
    surface: '#003a5c',
    text: '#e0f7ff',
    textDim: '#66b0cc',
    border: '#005580',
    danger: '#ff3366',
    warning: '#ffaa00',
    success: '#00ffaa',
    info: '#4488ff',
    mapTheme: 'dark',
  },
  forest: {
    name: 'Forest',
    accent: '#4ade80',
    accentHover: '#22c55e',
    bg: '#0a1a0a',
    bgLight: '#142814',
    surface: '#1e3a1e',
    text: '#d4edda',
    textDim: '#6b8e6b',
    border: '#2d4a2d',
    danger: '#ff4444',
    warning: '#ffcc00',
    success: '#4ade80',
    info: '#44aaff',
    mapTheme: 'dark',
  },
  midnight: {
    name: 'Midnight',
    accent: '#818cf8',
    accentHover: '#6366f1',
    bg: '#050510',
    bgLight: '#0a0a20',
    surface: '#12122e',
    text: '#c7d2fe',
    textDim: '#6b72a0',
    border: '#1e1e44',
    danger: '#f87171',
    warning: '#fbbf24',
    success: '#34d399',
    info: '#60a5fa',
    mapTheme: 'dark',
  },
  royal: {
    name: 'Royal',
    accent: '#f59e0b',
    accentHover: '#d97706',
    bg: '#0d0a1a',
    bgLight: '#1a1230',
    surface: '#2a1a4a',
    text: '#fef3c7',
    textDim: '#a68b5c',
    border: '#3d2a60',
    danger: '#ef4444',
    warning: '#f59e0b',
    success: '#10b981',
    info: '#3b82f6',
    mapTheme: 'dark',
  },
  blood: {
    name: 'Blood',
    accent: '#ff3333',
    accentHover: '#cc0000',
    bg: '#0a0000',
    bgLight: '#180000',
    surface: '#2a0000',
    text: '#ffcccc',
    textDim: '#994444',
    border: '#440000',
    danger: '#ff0000',
    warning: '#ff8800',
    success: '#ff4444',
    info: '#cc4444',
    mapTheme: 'dark',
  },
  pastel: {
    name: 'Pastel',
    accent: '#a78bfa',
    accentHover: '#8b5cf6',
    bg: '#faf5ff',
    bgLight: '#f3e8ff',
    surface: '#ffffff',
    text: '#4a4a6a',
    textDim: '#a8a0c0',
    border: '#e0d8f0',
    danger: '#f472b6',
    warning: '#fbbf24',
    success: '#6ee7b7',
    info: '#67e8f9',
    mapTheme: 'light',
  },
};

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => {
    try {
      return localStorage.getItem('eo_theme') || 'light';
    } catch {
      return 'light';
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
