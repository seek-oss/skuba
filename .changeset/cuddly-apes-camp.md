---
'skuba': minor
---

lint: Enable stricter import validation with [`noUncheckedSideEffectImports`](https://www.typescriptlang.org/tsconfig/#noUncheckedSideEffectImports)

Previously, TypeScript would not check side-effect imports:

```typescript
import './made-up-module.js';
```

Validation of these imports is now enabled by default in `skuba/config/tsconfig.json`. If you have a complex build process that produces assets that aren't known to TypeScript at time of linting, you may override the compiler option in your local `tsconfig.json` or include inline `// @ts-expect-error`s in your code.
