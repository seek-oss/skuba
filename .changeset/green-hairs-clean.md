---
'skuba': major
---

test: Migrate to Vitest

`skuba test` now calls [Vitest](https://vitest.dev/) as the test runner instead of Jest.

**Breaking change:** Unlike Jest, when running `skuba test` on your local machine, Vitest will run in watch mode by default. When run in CI, Vitest will run in non-watch mode.

**Breaking change:** Unlike Jest, `describe`, `it`, `expect`, etc. are not available as globals in Vitest. You need to import them from `vitest`:

```typescript
import { describe, it, expect } from 'vitest';
```

You can explicitly set the mode by passing the `--watch` or `--no-watch` flags to `skuba test` or use `skuba test run` to run in non-watch mode locally:

```shell
skuba test --watch
skuba test watch
```

```shell
skuba test --no-watch
skuba test run
```

`skuba test` will forward any additional arguments to Vitest, so you can also use Vitest's CLI flags:

```shell
skuba test --ui
```

This opens up the Vitest UI in your browser, which provides a visual interface for running and debugging tests.
