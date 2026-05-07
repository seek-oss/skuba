---
'skuba': major
---

test: Migrate to Vitest

`skuba test` now calls [Vitest](https://vitest.dev/) as the test runner instead of Jest.

Vitest does not provide globals for `describe`, `expect`, `it`, etc. You need to import them from `vitest`:

```typescript
import { describe, expect, it } from 'vitest';
```

Vitest brings environment-aware behaviour to `skuba test`: it defaults to watch mode in an interactive shell on your local machine, and non-watch mode in CI. You can explicitly set the mode by passing the `--watch` or `--no-watch` flags to `skuba test` or using the `skuba test watch` and `skuba test run` subcommands:

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
