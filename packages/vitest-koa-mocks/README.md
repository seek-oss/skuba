# @skuba-lib/vitest-koa-mocks

[![npm package](https://img.shields.io/npm/v/@skuba-lib/vitest-koa-mocks?labelColor=cb0000&color=5b5b5b)](https://www.npmjs.com/package/@skuba-lib/vitest-koa-mocks)
[![Node.js version](https://img.shields.io/node/v/@skuba-lib/vitest-koa-mocks?labelColor=5fa04e&color=5b5b5b)](https://www.npmjs.com/package/@skuba-lib/vitest-koa-mocks)

Vitest-compatible Koa mocks for testing Koa middleware and applications.

Inspired by [Shopify's jest-koa-mocks](https://github.com/Shopify/quilt/tree/main/packages/jest-koa-mocks), this package provides utilities that do not rely on Jest globals and are suitable for ESM-based Vitest setups.

## API reference

### `createMockContext`

Create a fully-typed mock [`Koa` `Context`](https://koajs.com) for testing middleware and request handlers.

```typescript
describe('createServiceAuthClient', () => {
  const serviceAuthClient = createServiceAuthClient({
    audience: 'upstream-service',
    baseUrl,
  });

  it('attaches expected headers', async () => {
    nock(baseUrl)
      .get('/mocked')
      // ensures authorization is passed through
      .matchHeader('authorization', MOCK_SERVICE_AUTH_HEADER)
      // ensures data tags are passed through
      .matchHeader('seek-tag-record-expiry', '0000-01-01T00:00:00.000Z')
      .matchHeader('seek-tag-test-record', 'true')
      // ensures tracing headers are passed through
      .matchHeader('x-request-id', 'abc')
      .matchHeader('x-session-id', 'cba')
      .reply(200);

    const ctx = createMockContext({
      headers: {
        'seek-tag-record-expiry': '0000-01-01T00:00:00.000Z',
        'seek-tag-test-record': 'true',
        'x-request-id': 'abc',
        'x-seek-jwt-issuer': 'requesting-service',
        'x-session-id': 'cba',
      },
    });

    contextStorage.enterWith(ctx);

    await Middleware.seekTagMiddleware(
      { ...ctx, headers: { ...ctx.headers } },
      () =>
        serviceAuthClient.request({
          url: '/mocked',
        }),
    );
  });
});
```

`createMockContext` accepts an options object that lets you control:

- HTTP details such as **`method`**, **`url`**, **`statusCode`**, **`headers`**, **`host`**, and whether the request is **`encrypted`**
- Koa-specific behaviour such as **`state`**, **`session`**, **`cookies`**, and **`throw`** / **`redirect`** handlers

ctx.throw and ctx.redirect are defaulted to vi.fn()s, allowing you to easily test that a request has redirected or thrown in your middleware.

```
import passwordValidator from '../password-validator';
import {createMockContext} from '@shopify/jest-koa-mocks';

describe('password-validator', () => {
  it('throws if no password query parameter is present', async () => {
    const ctx = createMockContext({url: '/validate'});

    await passwordValidator(ctx);

    expect(ctx.throw).toBeCalledWith(400);
  });

  it('redirects to /user if the password is correct', async () => {
    const ctx = createMockContext({url: '/validate?password=correct'});

    await passwordValidator(ctx);

    expect(ctx.redirect).toBeCalledWith('/user');
  });
});
```

- arbitrary **`customProperties`** that are merged onto the returned context

The returned context type is `MockContext`, which extends Koa's `Context` with:

- a `cookies` implementation compatible with `MockCookies`
- a `request` that can include `body`, `rawBody`, and `session` metadata

### `createMockCookies`

Create a standalone mock cookies implementation for Koa-style code.

```typescript
import { createMockCookies } from '@skuba-lib/vitest-koa-mocks';
import { expect, it } from 'vitest';

it('tracks request and response cookies', () => {
  const cookies = createMockCookies({ session: 'abc' });

  expect(cookies.get('session')).toBe('abc');

  cookies.set('session', 'def');

  // requestStore reflects initial inbound cookies
  expect(cookies.requestStore.get('session')).toBe('abc');

  // responseStore reflects cookies set during the test
  expect(cookies.responseStore.get('session')).toBe('def');
});
```

`createMockCookies` returns a `MockCookies` instance that:

- exposes `get` and `set` methods implemented with Vitest spies (`vi.fn`)
- maintains separate `requestStore` and `responseStore` `Map` instances for assertions
- supports a `secure` flag to simulate HTTPS behaviour
