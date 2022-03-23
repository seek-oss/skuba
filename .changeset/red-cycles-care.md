---
"skuba": minor
---

deps: ESLint 8 + eslint-config-seek 9

These major upgrades bundle new parser and plugin versions. See the [ESLint 8 guide](https://eslint.org/docs/8.0.0/user-guide/migrating-to-8.0.0) and [eslint-config-seek 9 release](https://github.com/seek-oss/eslint-config-seek/releases/tag/v9.0.0) for more details on the underlying changes.

We've introduced new linting rules like [@typescript-eslint/no-unsafe-argument](https://github.com/typescript-eslint/typescript-eslint/blob/main/packages/eslint-plugin/docs/rules/no-unsafe-argument.md), and resolved the following installation warning:

```console
babel-eslint is now @babel/eslint-parser. This package will no longer receive updates.
```

If you wish to relax some of the new rules, [extend](https://eslint.org/docs/user-guide/configuring/configuration-files#extending-configuration-files) your `.eslintrc.js` config:

```javascript
module.exports = {
  extends: ["skuba"],
  rules: {
    // Demote new TypeScript ESLint rule from "error" to "warn".
    "@typescript-eslint/no-unsafe-argument": "warn",
  },
};
```
