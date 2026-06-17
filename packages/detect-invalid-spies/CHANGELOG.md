# @skuba-lib/detect-invalid-spies

## 1.1.0

### Minor Changes

- **deps:** typescript ~6.0.0 ([#2309](https://github.com/seek-oss/skuba/pull/2309))

  This major release contains breaking changes. See the [TypeScript 6.0.0](https://devblogs.microsoft.com/typescript/announcing-typescript-6-0/) announcement for more information.

  If your tsconfig currently extends `skuba/config/tsconfig.json`, you may not need to update anything. However, if you have a custom configuration, you may need to manually add `node` to the `types` array.

  ```diff
  {
    "compilerOptions": {
  +   "types": ["node"]
    }
  }
  ```

### Patch Changes

- **deps:** @ast-grep/napi ~0.43.0 ([#2439](https://github.com/seek-oss/skuba/pull/2439))

## 1.0.1

### Patch Changes

- Fix detection of spies spanning multiple lines ([#2406](https://github.com/seek-oss/skuba/pull/2406))

## 1.0.0

### Major Changes

- Publish first version ([#2318](https://github.com/seek-oss/skuba/pull/2318))
