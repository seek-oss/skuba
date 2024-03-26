---
parent: Deep dives
---

# ESLint

---

[ESLint] is _the_ JavaScript linter.
You may be familiar with it from SEEK's frontend development toolkit,
[sku].

If you're coming from your own bespoke backend configuration or `@seek/seek-module-toolkit`,
you may have been using [TSLint].
TSLint has been [out of support since December 2020].

Our ESLint configuration introduces stricter rules around unsafe type usage.

---

## Extend configuration

Please contribute to the [eslint-config-seek] preset if you feel something is missing!
It may worthwhile starting with a discussion in [#typescriptification] to garner feedback.

If you wish to enforce additional rules within a given codebase or team,
you can [extend] your `.eslintrc.js`:

```javascript
module.exports = {
  extends: ['skuba'],
  rules: {
    // https://eslint.org/docs/rules/complexity
    complexity: ['error', { max: 3 }],
  },
};
```

Let's check that our new rule has taken effect.
Craft some absolute nonsense in a source file:

```typescript
export const evilFn = () => {
  if (NaN) {
    if (NaN) {
      if (NaN) {
      }
    }
  }
};
```

You should see some red squigglies!

```text
Arrow function has a complexity of 4. Maximum allowed is 3. eslint(complexity)
```

---

## Avoid `any` and `object`

Our ESLint rules flag [unsound type] usage that may cause unexpected runtime behaviour or crashes.

Consider the following alternatives:

1. Use `unknown` for a value whose type is truly unknown. This is a type-safe alternative to `any` that the TypeScript ecosystem is moving towards.

   ```diff
   - const data = JSON.parse(str);
   + const data = JSON.parse(str) as unknown;
   ```

1. Prove the value has a specific type using a [type guard] or runtime validation library.

   ```diff
   - const safeData = inputData as any;
   + const safeData = RuntimeValidator.check(inputData);
   ```

1. Use `Record<PropertyKey, unknown>` to indicate an object with unknown properties.

   ```diff
   - const isObject = (data: unknown): data is object => { ... };
   + const isObject = (data: unknown): data is Record<PropertyKey, unknown> => { ... };
   ```

1. Disable the specific ESLint rule for the problematic line.

   ```typescript
   /* eslint-disable-next-line @typescript-eslint/no-unsafe-assignment */
   const takeAnyBody = ctx.request.body;
   ```

[#typescriptification]: https://slack.com/app_redirect?channel=CDCPCEPV3
[eslint-config-seek]: https://github.com/seek-oss/eslint-config-seek
[eslint]: https://eslint.org/
[extend]: https://eslint.org/docs/user-guide/configuring/configuration-files#extending-configuration-files
[out of support since december 2020]: https://github.com/palantir/tslint/issues/4534
[sku]: https://github.com/seek-oss/sku
[tslint]: https://palantir.github.io/tslint/
[type guard]: https://www.typescriptlang.org/docs/handbook/advanced-types.html#user-defined-type-guards
[unsound type]: https://effectivetypescript.com/2021/05/06/unsoundness/#any
