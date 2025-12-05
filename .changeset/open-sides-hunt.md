---
'@skuba-lib/vitest-koa-mocks': major
---

Initial release of vitest-koa-mocks, providing Vitest-compatible mocks for Koa applications.

This package is inspired by [Shopify's jest-koa-mocks](https://github.com/Shopify/quilt/tree/main/packages/jest-koa-mocks) but designed specifically for Vitest without relying on Jest globals. It provides utilities to create mock Koa contexts and cookies for testing Koa middleware and applications.

This package will unblock ESM Vitest migration for the rest of SEEK by providing a Vitest-compatible alternative to Jest-based Koa mocking utilities.
