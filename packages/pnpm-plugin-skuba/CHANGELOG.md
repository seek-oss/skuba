# pnpm-plugin-skuba

## 3.1.0

### Minor Changes

- **lint:** Hoist `@skuba-lib/*` ([#2441](https://github.com/seek-oss/skuba/pull/2441))

  This allows you to use the [@skuba-lib/changesets-changelog](https://github.com/seek-oss/skuba/tree/main/packages/changesets-changelog) package in your project without having to install it as a direct dependency.

- **lint:** Remove `@arethetypeswrong/core@0.18.2>fflate` pnpm override ([#2447](https://github.com/seek-oss/skuba/pull/2447))

## 3.0.1

### Patch Changes

- **lint:** Add managed pnpm override for `fflate` in `@arethetypeswrong/core` ([#2435](https://github.com/seek-oss/skuba/pull/2435))

  This should resolve any `Cannot read properties of undefined (reading 'filename')` issue running `skuba build-package`

## 3.0.0

### Major Changes

- **lint:** Replace hoisted Jest dependencies with Vitest ([#2124](https://github.com/seek-oss/skuba/pull/2124))

### Patch Changes

- **lint:** Remove `semver@5.7.2` from `pnpm-workspace.yaml` `trustPolicyExclude` list ([#2300](https://github.com/seek-oss/skuba/pull/2300))

  This legacy package version is no longer a transitive dependency of skuba.

## 2.1.1

### Patch Changes

- **lint:** Disable `trustPolicy` and `strictDepBuilds` ([#2276](https://github.com/seek-oss/skuba/pull/2276))

  Due to issues with how `pnpm` parses the `trustPolicy` and `strictDepBuilds` options, we are disabling them temporarily

  These will be re-enabled in a future release once the underlying issues have been resolved.

- **lint:** Add [rolldown](https://rolldown.rs/) to `publicHoistPattern` ([#2275](https://github.com/seek-oss/skuba/pull/2275))

## 2.1.0

### Minor Changes

- Allow @ast-grep/lang-yaml build ([#2265](https://github.com/seek-oss/skuba/pull/2265))

## 2.0.0

### Major Changes

- Release stable version ([#2188](https://github.com/seek-oss/skuba/pull/2188))
