import { print, type DocumentNode } from 'graphql';
import { getLogin } from '@/utils/token';

export type GraphqlError = {
  message: string;
  path?: Array<string | number>;
};

export class AtomGraphqlError extends Error {
  errors: GraphqlError[];

  constructor(errors: GraphqlError[]) {
    super(errors.map((error) => error.message).join('; '));
    this.name = 'AtomGraphqlError';
    this.errors = errors;
  }
}

export function isForbiddenError(error: unknown) {
  if (error instanceof AtomGraphqlError) {
    return error.errors.some((entry) => isForbiddenMessage(entry.message));
  }
  if (error instanceof Error) {
    return isForbiddenMessage(error.message);
  }
  return false;
}

function isForbiddenMessage(message: string) {
  return message
    .split(';')
    .map((part) => part.trim().toLowerCase())
    .some((part) => part === 'forbidden');
}

export function isAuthenticationError(error: unknown) {
  const message =
    error instanceof AtomGraphqlError
      ? error.errors.map((entry) => entry.message).join('; ')
      : error instanceof Error
        ? error.message
        : '';

  return /forbidden|invalid token|expiredsignature/i.test(message);
}

export type GraphqlRequest<TVariables = Record<string, unknown>> = {
  query: string | DocumentNode;
  variables?: TVariables;
  operationName?: string;
  signal?: AbortSignal;
};

/**
 * Copilot 内嵌于平台，自身无独立登录页。GraphQL 请求统一走平台 `/graphql`，
 * 登录态 token 由 `utils/token` 的 login 写入 localStorage，此处自动注入。
 * 认证失败不跳转，直接抛出 `AtomGraphqlError` 由调用方处理。
 */
export async function graphqlClient<TData, TVariables = Record<string, unknown>>({
  query,
  variables,
  operationName,
  signal,
}: GraphqlRequest<TVariables>): Promise<TData> {
  const queryString = typeof query === 'string' ? query : print(query);
  const login = getLogin();

  const response = await fetch('/graphql', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(login?.token ? { authorization: `Bearer ${login.token}` } : {}),
    },
    credentials: 'same-origin',
    body: JSON.stringify({ query: queryString, variables, operationName }),
    signal,
  });

  const payload = await response.json();
  if (!response.ok || payload.errors?.length) {
    throw new AtomGraphqlError(
      payload.errors ?? [{ message: payload.message ?? 'GraphQL request failed' }],
    );
  }

  return payload.data as TData;
}
