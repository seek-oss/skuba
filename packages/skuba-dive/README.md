# 🤿🌊

[![Node.js version](https://img.shields.io/badge/node-%3E%3D%2014.18-brightgreen)](https://nodejs.org/en/)
[![npm package](https://img.shields.io/npm/v/skuba-dive)](https://www.npmjs.com/package/skuba-dive)

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

Runtime hook for import paths relative to `/src`.

Make a side-effectful import at the top of your entry point(s):

```typescript
// /src/register.ts

import 'skuba-dive/register';
```

```typescript
// /src/app.ts

import './register';

import { config } from 'src/config';

export = new Koa();
```

The hook must be imported from a module that sits directly under `/src` for module resolution to work correctly.

## Design

`skuba-dive` packages up:

- General application boilerplate that doesn't justify a standalone module
- Runtime functionality that complements `skuba`

See `skuba`'s [goals] and [non-goals] for more information.

[goals]: https://seek-oss.github.io/skuba/docs/about.html#goals
[non-goals]: https://seek-oss.github.io/skuba/docs/about.html#non-goals
