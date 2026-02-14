# @skuba-lib/api

## 2.0.2

### Patch Changes

- Fix `moduleResolution` `node` types ([#2233](https://github.com/seek-oss/skuba/pull/2233))

## 2.0.1

### Patch Changes

- **deps:** zod ^4.3.5 ([#2218](https://github.com/seek-oss/skuba/pull/2218))

  This resolves errors such as "ID X already exists in the registry" caused by multiple Zod versions.

  If your package declares a dependency on Zod, ensure you use unpinned versioning (e.g. `"zod": "^4.3.5"` instead of `"zod": "4.3.5"`) to avoid installing multiple versions.

## 2.0.0

### Major Changes

- **deps:** Require Node.js 22.14.0+ ([#2165](https://github.com/seek-oss/skuba/pull/2165))

## 1.0.1

### Patch Changes

- **types:** Fix `Node16` module resolution compatibility ([#2086](https://github.com/seek-oss/skuba/pull/2086))

## 1.0.0

### Major Changes

- **api:** Publish standalone `@skuba-lib/api` package ([#2072](https://github.com/seek-oss/skuba/pull/2072))

  Our [development API](https://seek-oss.github.io/skuba/docs/development-api/) is now available in a standalone package. Its namespaces are available through the root `@skuba-lib/api` import, or individual submodule imports such as `@skuba-lib/api/buildkite`.

  The `@skuba-lib/api` package may be useful for projects that include:
  - A dev tool/package that makes use of the development API. The package can now replace the larger `skuba` toolkit with `@skuba-lib/api` in `dependencies`.
  - A back-end application that makes use of the development API but has its own tooling to build and test code. The application can now replace the larger `skuba` toolkit with `@skuba-lib/api` in `devDependencies` .

  The `skuba` package retains its re-exports of these API namespaces for convenience.
