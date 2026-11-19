import { theme as antdTheme } from 'antd';

export type ThemeMode = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'copilot-theme-mode';

const FONT_FAMILY =
  'Inter, "SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif';

/** 读取首选主题：用户显式选择优先，否则跟随系统。 */
export function getInitialTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'light';
  let stored: string | null = null;
  try {
    stored = window.localStorage.getItem(THEME_STORAGE_KEY);
  } catch {
    /* 隐私模式下不可用 */
  }
  if (stored === 'light' || stored === 'dark') return stored;
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function applyTheme(mode: ThemeMode) {
  if (typeof document === 'undefined') return;
  document.documentElement.dataset.theme = mode;
  document.documentElement.style.colorScheme = mode;
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, mode);
  } catch {
    /* ignore */
  }
}

/** 统一 antd token：主色、圆角、阴影、字号与容器色。 */
export function buildTheme(mode: ThemeMode) {
  const dark = mode === 'dark';
  return {
    algorithm: dark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
    token: {
      colorPrimary: dark ? '#8f8cf7' : '#5b5bd6',
      colorInfo: dark ? '#8f8cf7' : '#5b5bd6',
      colorSuccess: dark ? '#4ade80' : '#16a34a',
      colorWarning: dark ? '#fbbf24' : '#d97706',
      colorError: dark ? '#fb7185' : '#dc2626',
      colorBgLayout: dark ? '#0b0b0f' : '#f5f5f3',
      colorBgContainer: dark ? '#15151b' : '#ffffff',
      colorBgElevated: dark ? '#1c1c24' : '#ffffff',
      colorBorder: dark ? '#2b2b36' : '#e7e7e3',
      colorBorderSecondary: dark ? '#23232c' : '#efefeb',
      colorText: dark ? '#f2f2f5' : '#20201e',
      colorTextSecondary: dark ? '#a4a4af' : '#6b6b66',
      colorTextTertiary: dark ? '#71717d' : '#9a9a94',
      colorFillSecondary: dark ? 'rgba(255,255,255,.06)' : 'rgba(20,20,20,.04)',
      colorFillTertiary: dark ? 'rgba(255,255,255,.045)' : 'rgba(20,20,20,.03)',
      colorFillQuaternary: dark ? 'rgba(255,255,255,.03)' : 'rgba(20,20,20,.02)',
      borderRadius: 12,
      borderRadiusLG: 16,
      borderRadiusSM: 8,
      fontFamily: FONT_FAMILY,
      fontSize: 14,
      controlHeight: 38,
      boxShadow: dark
        ? '0 1px 2px rgba(0,0,0,.35), 0 12px 32px rgba(0,0,0,.35)'
        : '0 1px 2px rgba(20,20,20,.04), 0 12px 32px rgba(20,20,20,.07)',
      boxShadowSecondary: dark
        ? '0 8px 28px rgba(0,0,0,.45)'
        : '0 8px 28px rgba(20,20,20,.10)',
    },
    components: {
      Button: {
        borderRadius: 10,
        controlHeight: 38,
        fontWeight: 500,
        primaryShadow: 'none',
      },
      Input: {
        borderRadius: 10,
        activeShadow: dark
          ? '0 0 0 3px rgba(143,140,247,.18)'
          : '0 0 0 3px rgba(91,91,214,.12)',
      },
      Card: { borderRadiusLG: 16 },
      Tooltip: { borderRadius: 8 },
      Drawer: { colorBgElevated: dark ? '#111117' : '#ffffff' },
      Popconfirm: { borderRadiusLG: 12 },
      Switch: { colorPrimary: dark ? '#8f8cf7' : '#5b5bd6' },
    },
  };
}
