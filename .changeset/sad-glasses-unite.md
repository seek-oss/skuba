---
'skuba': major
---

deps: eslint-config-skuba 7

This enforces that file extensions be added to every import statement. This helps prepare for an eventual migration to ECMAScript Modules (ESM). You can read more about this in our [deep dive](https://seek-oss.github.io/skuba/docs/deep-dives/esm.html).

> **Warning**: The initial lint after upgrading may take longer than usual to complete as the new rules need to analyze all import statements in your codebase.

> **Note**: This rule may not catch all cases when using TypeScript path aliases except for 'src' aliases

To opt out of the new rules, add the following to your `eslint.config.js`:

```js
{
  rules: {
    'require-extensions/require-extensions': 'off',
    'require-extensions/require-index': 'off',
  },
}
```

If you are applying a custom `moduleNameMapper` to your Jest config, you may need to add the following to it for it to recognise imports with extensions.

```ts
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
```
