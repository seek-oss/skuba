---
'skuba': minor
---

deps: eslint-config-seek 11

This major upgrade enforces [consistent type imports and exports](https://typescript-eslint.io/blog/consistent-type-imports-and-exports-why-and-how/).

```diff
- import { Context } from 'aws-lambda';
+ import type { Context } from 'aws-lambda';
```

`skuba format` will modify your imports and exports to be consistent with linting rules. These changes are automatically committed if you have [GitHub autofixes](https://seek-oss.github.io/skuba/docs/deep-dives/github.html#github-autofixes) enabled on your project.
