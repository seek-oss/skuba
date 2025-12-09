---
'@skuba-lib/vitest-koa-mocks': major
---

Initial release of vitest-koa-mocks, providing Vitest-compatible mocks for Koa applications.

This package is inspired by [Shopify's jest-koa-mocks](https://github.com/Shopify/quilt/tree/main/packages/jest-koa-mocks) but designed specifically for Vitest without relying on Jest globals. It provides utilities to create mock Koa contexts and cookies for testing Koa middleware and applications.

Publish new package

`@skuba-lib/vitest-koa-mocks` provides utilities to create mock Koa contexts and cookies for testing Koa middleware and applications. It is based on [`@shopify/jest-koa-mocks`](https://github.com/Shopify/quilt/tree/main/packages/jest-koa-mocks) but has been adapted for Vitest.

Projects that are migrating from CommonJS + Jest to ESM + Vitest may use this package as a drop-in replacement for `@shopify/jest-koa-mocks`.
