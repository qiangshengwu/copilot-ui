import { GetTenantQuery, LoginMutation } from '@/graphql/generated/graphql';

export const setLogin = (data: LoginMutation['login']) => {
  const login = JSON.stringify(data);
  return localStorage.setItem('login', login);
};

export const delLogin = () => {
  localStorage.removeItem('login');
};

export const getLogin = (): LoginMutation['login'] | undefined => {
  const login = localStorage.getItem('login');
  if (login !== null) {
    return JSON.parse(login);
  }
  return undefined;
};

export const setTenant = (t: GetTenantQuery['tenant']) => {
  const tenant = JSON.stringify(t);
  return localStorage.setItem('tenant', tenant);
};

export const delTenant = () => {
  localStorage.removeItem('tenant');
};

export const getTenant = (): GetTenantQuery['tenant'] | undefined => {
  const data = localStorage.getItem('tenant');
  if (data !== null) {
    return JSON.parse(data);
  }
  return undefined;
};
