---
'skuba': minor
---

**node:** Add command

`skuba node` lets you run a TypeScript source file, or open a REPL if none is provided:

- `skuba node src/some-cli-script.ts`
- `skuba node`

This automatically registers a `src` module alias for ease of local development. For example, you can run a prospective `src/someLocalCliScript.ts` without having to register a module alias resolver:

```typescript
// This `src` module alias just works under `skuba node` and `skuba start`
import { rootLogger } from 'src/framework/logging';
```

```bash
yarn skuba node src/someLocalCliScript
```

If you use this alias in your production code, your production entry point(s) will need to import a runtime module alias resolver like [`skuba-dive/register`](https://github.com/seek-oss/skuba-dive#register). For example, your `src/app.ts` may look like:

```typescript
// This must be imported directly within the `src` directory
import 'skuba-dive/register';

// You can use the `src` module alias after registration
import { rootLogger } 'src/framework/logging';
```
