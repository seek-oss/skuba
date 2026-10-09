# @skuba-lib/api

## 3.0.0

### Major Changes

- Remove `moduleResolution` `node10`/`node` compatibility layer ([#2600](https://github.com/seek-oss/skuba/pull/2600) [`eebe4b4`](https://github.com/seek-oss/skuba/commit/eebe4b4250a0aae8812960362a99e7cfc48536ea))

  Subpath imports require `moduleResolution` `node16`, `nodenext`, or `bundler`

### Patch Changes

- **Git.commitAllChanges:** Fix change filtering when `dir` is a subdirectory of the Git root ([#2547](https://github.com/seek-oss/skuba/pull/2547) [`dc61c18`](https://github.com/seek-oss/skuba/commit/dc61c18eddf7efd58dc47c557ddf181296cf69ca))

  The working-directory filter compared a Git-root-relative file path against a
  `dir` resolved from the current working directory, so running against a
  subdirectory of the repository could skip every change and produce an empty
  commit. Both paths are now resolved to absolute before comparison.

- **deps:** Drop direct dependencies on `concurrently` and `npm-run-path` ([#2602](https://github.com/seek-oss/skuba/pull/2602) [`c490d44`](https://github.com/seek-oss/skuba/commit/c490d443166a107cc80a88ae8538327add910283))

- **api:** `Cdk.normaliseTemplate` now normalises `CurrentVersion` asset hashes for any construct id, not just `worker`. Previously, Lambda version logical IDs like `notifierCurrentVersion...` were left with volatile hashes, causing cross-platform snapshot churn. ([#2554](https://github.com/seek-oss/skuba/pull/2554) [`28704fb`](https://github.com/seek-oss/skuba/commit/28704fbfb002eb4d67fb1bb9d3fc5e20279b2cd1))

- **deps:** @octokit/types ^17.0.0 ([#2548](https://github.com/seek-oss/skuba/pull/2548) [`222af24`](https://github.com/seek-oss/skuba/commit/222af245efc4e843e5297c088122464bd10b4609))

- **deps:** @octokit/types ^18.0.0 ([#2579](https://github.com/seek-oss/skuba/pull/2579) [`dd96c23`](https://github.com/seek-oss/skuba/commit/dd96c234af4f1da44d8c10a7a10bb94e57cb352c))

## 2.3.0

### Minor Changes

- **Git.getChangedFiles:** Support `src` and `dst` parameters for diffing ([#2490](https://github.com/seek-oss/skuba/pull/2490))

  See the [documentation](https://seek-oss.github.io/skuba/docs/development-api/git.html#getchangedfiles) for more information.

## 2.2.0

### Minor Changes

- **api:** Add `Cdk.normaliseTemplate` ([#2418](https://github.com/seek-oss/skuba/pull/2418))

  This function produces stable snapshots of CDK stack templates by stripping volatile, environment-specific values. This is particularly useful when testing to avoid snapshot churn on inconsequential differences in the generated templates.

### Patch Changes

- **deps:** concurrently ^10.0.0 ([#2446](https://github.com/seek-oss/skuba/pull/2446))

## 2.1.2

### Patch Changes

- **deps:** Remove inlined dependencies ([#2411](https://github.com/seek-oss/skuba/pull/2411))

## 2.1.1

### Patch Changes

- **deps:** isomorphic-git 1.37.6 ([#2395](https://github.com/seek-oss/skuba/pull/2395))

## 2.1.0

### Minor Changes

- Migrate to ESM ([#2124](https://github.com/seek-oss/skuba/pull/2124))

  This package is still being published as a dual ESM/CJS package, but the source code is now ESM.

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
