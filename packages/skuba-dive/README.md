# 🤿🌊

[![npm package](https://img.shields.io/npm/v/skuba-dive?labelColor=cb0000&color=5b5b5b)](https://www.npmjs.com/package/skuba-dive)
[![Node.js version](https://img.shields.io/node/v/skuba-dive?labelColor=5fa04e&color=5b5b5b)](https://www.npmjs.com/package/skuba-dive)

Minimal runtime for [`skuba`](https://github.com/seek-oss/skuba).

## Table of contents

- [API reference](#api-reference)
  - [Assert](#assert)
  - [Env](#env)
  - [Register](#register)
- [Design](#design)

## API reference

### Assert

[TypeScript assertion functions] for narrowing down types in unit tests and the like.

These may be used for input validation in your application code at a pinch,
but consider a proper validation library with richer error handling and reporting.

[typescript assertion functions]: https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-7.html#assertion-functions

```typescript
import { Assert } from 'skuba-dive';

it('should think of a good test case name', () => {
  const result = numberOrNull();
  // result is number | null

  Assert.notNullish(result);
  // result is number
});
```

### Env

Functions for reading values out of environment variables.

For example, in your `/src/config.ts`:

```typescript
import { Env } from 'skuba-dive';

const ENVIRONMENTS = ['dev', 'prod'] as const;

export type Environment = (typeof ENVIRONMENTS)[number];

export const environment = Env.oneOf(ENVIRONMENTS)('ENVIRONMENT');
// 'dev' | 'prod'

export const port = Env.nonNegativeInteger('PORT', { default: undefined });
// number | undefined

export const version = Env.string('VERSION', { default: 'local' });
// string | 'local'

export const flag = Env.boolean('FLAG');
// boolean
```

Each function will throw if its environment variable is not set and `opts.default` is not provided.

### Register

`skuba-dive/register` has been replaced with native subpath imports supported by both [TypeScript](https://www.typescriptlang.org/docs/handbook/modules/reference.html#packagejson-imports-and-self-name-imports) and [Node.js](https://nodejs.org/api/packages.html#subpath-imports) as a part of our [ESM migration](https://seek-oss.github.io/skuba/docs/deep-dives/esm.html). Please upgrade to [skuba 13](https://github.com/seek-oss/skuba/releases/tag/skuba%4013.0.0) to automatically migrate your codebase.

## Design

`skuba-dive` packages up:

- General application boilerplate that doesn't justify a standalone module
- Runtime functionality that complements `skuba`

See `skuba`'s [goals] and [non-goals] for more information.

[goals]: https://seek-oss.github.io/skuba/docs/about.html#goals
[non-goals]: https://seek-oss.github.io/skuba/docs/about.html#non-goals
