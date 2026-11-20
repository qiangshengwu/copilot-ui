import React, { createContext, useContext, useMemo } from 'react';
import type { Client } from 'openapi-fetch';
import zhCN from '@/locales/zh-CN';
import enUS from '@/locales/en-US';
import type { paths } from '@/types/copilot';

export type CopilotLocale = 'zh-CN' | 'en-US';

export interface CopilotRuntimeConfig {
  tenantId: string;
  tenantName?: string;
  baseUrl: string;
  locale: CopilotLocale;
  /** 默认全局 fetch；宿主可传统一拦截器。 */
  fetch: typeof fetch;
}

export interface CopilotRuntime extends CopilotRuntimeConfig {
  t: (id: string, vars?: Record<string, string | number>) => string;
  isZh: boolean;
  /** OpenAPI 客户端。必须用大写方法名（GET/POST/PATCH/DELETE）. */
  client: Client<paths>;
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
