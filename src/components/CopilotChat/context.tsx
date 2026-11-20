import React, { createContext, useContext, useMemo } from 'react';
import zhCN from '@/locales/zh-CN';
import enUS from '@/locales/en-US';

export type CopilotLocale = 'zh-CN' | 'en-US';

export type TokenGetter = () => string | undefined;

export interface CopilotRuntimeConfig {
  tenantId: string;
  tenantName?: string;
  getToken: TokenGetter;
  onUnauthorized?: () => void;
  baseUrl: string;
  locale: CopilotLocale;
}

export interface CopilotRuntime extends CopilotRuntimeConfig {
  t: (id: string, vars?: Record<string, string | number>) => string;
  isZh: boolean;
  client: any;
  authFetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
}

const messages = {
  'zh-CN': zhCN as Record<string, string>,
  'en-US': enUS as Record<string, string>,
};

export function translate(
  locale: CopilotLocale,
  id: string,
  vars?: Record<string, string | number>,
): string {
  let text = messages[locale]?.[id] ?? messages['zh-CN']?.[id] ?? id;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
    }
  }
  return text;
}

const CopilotContext = createContext<CopilotRuntime | null>(null);

export function CopilotProvider({
  value,
  children,
}: {
  value: CopilotRuntime;
  children: React.ReactNode;
}) {
  return <CopilotContext.Provider value={value}>{children}</CopilotContext.Provider>;
}

export function useCopilot(): CopilotRuntime {
  const ctx = useContext(CopilotContext);
  if (!ctx) {
    throw new Error('useCopilot must be used inside <CopilotChat />');
  }
  return ctx;
}

export function useCopilotT() {
  const { t } = useCopilot();
  return t;
}
