---
'@skuba-lib/api': major
'skuba': minor
---

api: Publish standalone `@skuba-lib/api` package

Our [development API](https://seek-oss.github.io/skuba/docs/development-api/) is now available in a standalone package. Its namespaces are available through the root `@skuba-lib/api` import, or individual submodule imports such as `@skuba-lib/api/buildkite`.

The `@skuba-lib/api` package may be useful for projects that include:

- A devtool/package that makes use of the development API. The package can now replace the larger `skuba` toolkit with `@skuba-lib/api` in `dependencies`.
- A back-end application that makes use of the development API but has its own tooling to build and test code. The application can now replace the larger `skuba` toolkit with `@skuba-lib/api` in `devDependencies` .
  
The `skuba` package retains its re-exports of these API namespaces for convenience.
