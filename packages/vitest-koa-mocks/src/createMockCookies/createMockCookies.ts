import type { Context } from 'koa';
import { vi } from 'vitest';

export type Cookies = Context['cookies'];

export interface MockCookies extends Cookies {
  requestStore: Map<string, string>;
  responseStore: Map<string, string>;
}

export default function createMockCookies(
  cookies = {},
  secure = true,
): MockCookies {
  const cookieEntries = Object.keys(cookies).map(
    (key) => [key, cookies[key as keyof typeof cookies]] as [string, string],
  );

  const requestStore = new Map<string, string>(cookieEntries);
  const responseStore = new Map<string, string>(cookieEntries);

  return {
    set: vi.fn((key, value) => {
      return responseStore.set(key, value);
    }),
    get: vi.fn((key) => {
      return requestStore.get(key);
    }),
    requestStore,
    responseStore,
    secure,
  } as any;
}
