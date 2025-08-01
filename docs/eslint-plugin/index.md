---
has_children: true
nav_order: 5
---

# ESLint plugin

---

`eslint-plugin-skuba` is bundled with `skuba` and `eslint-config-skuba` by default.

It can be configured manually outside of these contexts:

```console
pnpm install --dev eslint-plugin-skuba
```

```typescript
const skuba = require('eslint-plugin-skuba');

module.exports = [
  ...skuba.configs.recommended.map((config) => ({
    ...config,
    files: [`**/*.{cts,mts,ts,tsx}`],
  })),
];
```
