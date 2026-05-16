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

### Cdk

Functions for working with CDK in tests.

```typescript
import { Cdk } from 'skuba-dive';
```

#### `Cdk.normaliseTemplate(template)`

Strips volatile, environment-specific values from a CDK stack template to produce stable snapshots in tests.

```typescript
import { Template } from 'aws-cdk-lib/assertions';
import { Cdk } from 'skuba-dive';

expect(Cdk.normaliseTemplate(Template.fromStack(stack))).toMatchSnapshot();
```

The following values are normalised:

- **S3 keys** — asset hashes replaced with `x` characters of equal length
- **Worker versions** — `workerCurrentVersion<hash>` hashes replaced with `x` characters of equal length
- **Semantic versions** — e.g. `1.2.3-<suffix>` → `x.x.x-xxxx`, `v1.2.3` → `vx.x.x`
- **Datadog tags** — `DD_TAGS` containing `git.commit.sha` and `git.repository_url` removed entirely
- **Datadog layer versions** — layer ARN version numbers replaced with `x`

#### `Cdk.normaliseTemplateJson(json)`

A lower-level alternative that operates directly on a JSON string, for cases where you need more control over serialisation.

```typescript
import { Cdk } from 'skuba-dive';

const json = Cdk.normaliseTemplateJson(JSON.stringify(template.toJSON()));
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
