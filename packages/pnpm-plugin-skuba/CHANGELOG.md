# pnpm-plugin-skuba

## 3.0.0

### Major Changes

- **lint:** Replace hoisted Jest dependencies with Vitest ([#2124](https://github.com/seek-oss/skuba/pull/2124))

### Patch Changes

- **lint:** Update `pnpm-workspace.yaml` `trustPolicyExclude` list ([#2300](https://github.com/seek-oss/skuba/pull/2300))

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
