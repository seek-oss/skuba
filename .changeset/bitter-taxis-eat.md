---
'skuba': major
---

deps: eslint-config-skuba 7

This enforces that file extensions be added to every import statement. This helps prepare for an eventual migration to ECMAScript Modules (ESM).

> **Note**: This rule may not catch all cases when using TypeScript path aliases.

To disable this behavior, add the following to your `eslint.config.js`:

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
    // https://github.com/kulshekhar/ts-jest/issues/1057#issuecomment-1482644543
    '^(\\.\\.?\\/.+)\\.jsx?$': '$1',
  },
```
