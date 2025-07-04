---
'skuba': major
---

deps: eslint-config-skuba 7

This enforces that file extensions be added to every import statement. This helps prepare for an eventual migration to ECMAScript Modules (ESM).

> **Note**: This rule may not catch all cases when using TypeScript path aliases except for 'src' aliases

To disable this behavior, add the following to your `eslint.config.js`:

```js
{
  rules: {
    'require-extensions/require-extensions': 'off',
    'require-extensions/require-index': 'off',
  },
}
```
