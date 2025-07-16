---
'eslint-config-skuba': major
---

Enforce file extensions in imports

This enforces that file extensions be added to every import statement. This helps prepare for an eventual migration to ECMAScript Modules (ESM). You can read more about this in our [deep dive](https://seek-oss.github.io/skuba/docs/deep-dives/esm.html).

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

If you are depending on `eslint-config-skuba` without using skuba, you may need to add the following config to `jest.config.ts` for it to recognise imports with extensions.

```ts
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
```
