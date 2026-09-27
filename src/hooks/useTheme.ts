import { useCallback, useState } from 'react';

const THEME_KEY = 'copilot-theme';

function initialDark(): boolean {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved) return saved === 'dark';
  } catch {
    /* ignore */
  }
  return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

/**
 * 深色态 + localStorage 持久化（键 copilot-theme）。
 * 不再切 <html>.dark class：主题完全由 XProvider 的 algorithm 驱动，
 * 组件经 theme.useToken() 取对应 token，无需全局 class。
 */
export function useTheme() {
  const [dark, setDark] = useState<boolean>(initialDark);

  const toggle = useCallback(() => {
    setDark((v) => {
      const next = !v;
      try {
        localStorage.setItem(THEME_KEY, next ? 'dark' : 'light');
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  return { dark, toggle };
}
