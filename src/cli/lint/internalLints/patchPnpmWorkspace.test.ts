import memfs, { vol } from 'memfs';

import { patchPnpmWorkspace } from './patchPnpmWorkspace.js';

const volToJson = () => vol.toJSON(process.cwd(), undefined, true);

jest.mock('fs-extra', () => memfs);

beforeEach(() => {
  vol.reset();
});

describe('patchPnpmWorkspace', () => {
  it('should skip if pnpm-workspace.yaml is not found', async () => {
    const result = await patchPnpmWorkspace('format');

    expect(result).toEqual({
      ok: true,
      fixable: false,
      annotations: [],
    });
  });

  it('should apply defaults to an empty pnpm-workspace.yaml', async () => {
    vol.fromJSON({
      'pnpm-workspace.yaml': '',
    });

    const result = await patchPnpmWorkspace('format');

    expect(result).toEqual({
      ok: true,
      fixable: false,
      annotations: [],
    });

    expect(volToJson()['pnpm-workspace.yaml']).toMatchInlineSnapshot(`
      "
      allowBuilds:
        '@ast-grep/lang-json': true # Managed by skuba
        '@ast-grep/lang-yaml': true # Managed by skuba
        '@datadog/native-appsec': true # Managed by skuba
        '@datadog/native-iast-taint-tracking': true # Managed by skuba
        '@datadog/native-metrics': true # Managed by skuba
        '@datadog/pprof': true # Managed by skuba
        dd-trace: true # Managed by skuba
        esbuild: true # Managed by skuba
        protobufjs: true # Managed by skuba
        unix-dgram: true # Managed by skuba
        unrs-resolver: true # Managed by skuba
      blockExoticSubdeps: true # Managed by skuba
      ignorePatchFailures: false # Managed by skuba
      minimumReleaseAge: 4320 # Managed by skuba
      minimumReleaseAgeExclude:
        - '@seek/*' # Managed by skuba
        - '@skuba-lib/*' # Managed by skuba
        - eslint-config-seek # Managed by skuba
        - eslint-config-skuba # Managed by skuba
        - eslint-plugin-skuba # Managed by skuba
        - pnpm-plugin-skuba # Managed by skuba
        - skuba # Managed by skuba
        - skuba-dive # Managed by skuba
        - tsconfig-seek # Managed by skuba
      packageManagerStrictVersion: true # Managed by skuba
      publicHoistPattern:
        - '@arethetypeswrong/core' # Managed by skuba
        - '@eslint/*' # Managed by skuba
        - '@types*' # Managed by skuba
        - esbuild # Managed by skuba
        - eslint # Managed by skuba
        - eslint-config-skuba # Managed by skuba
        - jest # Managed by skuba
        - prettier # Managed by skuba
        - publint # Managed by skuba
        - rolldown # Managed by skuba
        - tsconfig-seek # Managed by skuba
        - tsdown # Managed by skuba
        - typescript # Managed by skuba
      strictDepBuilds: false # Managed by skuba
      trustPolicy: off # Managed by skuba
      trustPolicyExclude:
        - semver@5.7.2 || 6.3.1 # Managed by skuba"
    `);
  });

  it('should be idempotent', async () => {
    vol.fromJSON({
      'pnpm-workspace.yaml': '',
    });

    const firstResult = await patchPnpmWorkspace('format');
    expect(firstResult).toEqual({
      ok: true,
      fixable: false,
      annotations: [],
    });
    const result1 = volToJson()['pnpm-workspace.yaml'];

    const secondResult = await patchPnpmWorkspace('format');
    expect(secondResult).toEqual({
      ok: true,
      fixable: false,
      annotations: [],
    });

    const result2 = volToJson()['pnpm-workspace.yaml'];

    expect(result1).toBe(result2);
  });

  it('should handle regular comments in pnpm-workspace.yaml', async () => {
    vol.fromJSON({
      'pnpm-workspace.yaml': `
# This is a comment
allowBuilds:
  some-package: false # Inline comment
# Another comment
publicHoistPattern:
  - some-package # Comment after list item
trustPolicyExclude:
  - some-package@1.0.0 # Comment after list item
  # Comment on empty list item
`,
    });

    const result = await patchPnpmWorkspace('format');

    expect(result).toEqual({
      ok: true,
      fixable: false,
      annotations: [],
    });

    expect(volToJson()['pnpm-workspace.yaml']).toMatchInlineSnapshot(`
      "# This is a comment
      allowBuilds:
        some-package: false # Inline comment
      # Another comment
        '@ast-grep/lang-json': true # Managed by skuba
        '@ast-grep/lang-yaml': true # Managed by skuba
        '@datadog/native-appsec': true # Managed by skuba
        '@datadog/native-iast-taint-tracking': true # Managed by skuba
        '@datadog/native-metrics': true # Managed by skuba
        '@datadog/pprof': true # Managed by skuba
        dd-trace: true # Managed by skuba
        esbuild: true # Managed by skuba
        protobufjs: true # Managed by skuba
        unix-dgram: true # Managed by skuba
        unrs-resolver: true # Managed by skuba
      publicHoistPattern:
        - some-package # Comment after list item
        - '@arethetypeswrong/core' # Managed by skuba
        - '@eslint/*' # Managed by skuba
        - '@types*' # Managed by skuba
        - esbuild # Managed by skuba
        - eslint # Managed by skuba
        - eslint-config-skuba # Managed by skuba
        - jest # Managed by skuba
        - prettier # Managed by skuba
        - publint # Managed by skuba
        - rolldown # Managed by skuba
        - tsconfig-seek # Managed by skuba
        - tsdown # Managed by skuba
        - typescript # Managed by skuba
      trustPolicyExclude:
        - some-package@1.0.0 # Comment after list item
        # Comment on empty list item
        - semver@5.7.2 || 6.3.1 # Managed by skuba

      blockExoticSubdeps: true # Managed by skuba
      ignorePatchFailures: false # Managed by skuba
      minimumReleaseAge: 4320 # Managed by skuba
      minimumReleaseAgeExclude:
        - '@seek/*' # Managed by skuba
        - '@skuba-lib/*' # Managed by skuba
        - eslint-config-seek # Managed by skuba
        - eslint-config-skuba # Managed by skuba
        - eslint-plugin-skuba # Managed by skuba
        - pnpm-plugin-skuba # Managed by skuba
        - skuba # Managed by skuba
        - skuba-dive # Managed by skuba
        - tsconfig-seek # Managed by skuba
      packageManagerStrictVersion: true # Managed by skuba
      strictDepBuilds: false # Managed by skuba
      trustPolicy: off # Managed by skuba"
    `);
  });

  it('should skip saving if the mode is lint', async () => {
    vol.fromJSON({
      'pnpm-workspace.yaml': '',
    });

    const result = await patchPnpmWorkspace('lint');

    expect(result).toEqual({
      ok: false,
      fixable: true,
      annotations: [
        {
          message:
            'pnpm-workspace.yaml is out of date. Run `pnpm skuba format` to update it.',
          path: 'pnpm-workspace.yaml',
        },
      ],
    });

    // Should not save changes in lint mode
    expect(volToJson()['pnpm-workspace.yaml']).toBe('');
  });

  it('should preserve existing values in pnpm-workspace.yaml', async () => {
    vol.fromJSON({
      'pnpm-workspace.yaml': `
blockExoticSubdeps: false
publicHoistPattern:
  - some-package
allowBuilds:
  some-package: false
trustPolicyExclude:
  - some-package@1.0.0`,
    });

    const result = await patchPnpmWorkspace('format');

    expect(result).toEqual({
      ok: true,
      fixable: false,
      annotations: [],
    });

    expect(volToJson()['pnpm-workspace.yaml']).toMatchInlineSnapshot(`
      "blockExoticSubdeps: true # Managed by skuba
      publicHoistPattern:
        - some-package
        - '@arethetypeswrong/core' # Managed by skuba
        - '@eslint/*' # Managed by skuba
        - '@types*' # Managed by skuba
        - esbuild # Managed by skuba
        - eslint # Managed by skuba
        - eslint-config-skuba # Managed by skuba
        - jest # Managed by skuba
        - prettier # Managed by skuba
        - publint # Managed by skuba
        - rolldown # Managed by skuba
        - tsconfig-seek # Managed by skuba
        - tsdown # Managed by skuba
        - typescript # Managed by skuba
      allowBuilds:
        some-package: false
        '@ast-grep/lang-json': true # Managed by skuba
        '@ast-grep/lang-yaml': true # Managed by skuba
        '@datadog/native-appsec': true # Managed by skuba
        '@datadog/native-iast-taint-tracking': true # Managed by skuba
        '@datadog/native-metrics': true # Managed by skuba
        '@datadog/pprof': true # Managed by skuba
        dd-trace: true # Managed by skuba
        esbuild: true # Managed by skuba
        protobufjs: true # Managed by skuba
        unix-dgram: true # Managed by skuba
        unrs-resolver: true # Managed by skuba
      trustPolicyExclude:
        - some-package@1.0.0
      ignorePatchFailures: false # Managed by skuba
      minimumReleaseAge: 4320 # Managed by skuba
      minimumReleaseAgeExclude:
        - '@seek/*' # Managed by skuba
        - '@skuba-lib/*' # Managed by skuba
        - eslint-config-seek # Managed by skuba
        - eslint-config-skuba # Managed by skuba
        - eslint-plugin-skuba # Managed by skuba
        - pnpm-plugin-skuba # Managed by skuba
        - skuba # Managed by skuba
        - skuba-dive # Managed by skuba
        - tsconfig-seek # Managed by skuba
      packageManagerStrictVersion: true # Managed by skuba
      strictDepBuilds: false # Managed by skuba
      trustPolicy: off # Managed by skuba
        - semver@5.7.2 || 6.3.1 # Managed by skuba"
    `);
  });

  it('should fix flipped boolean values in pnpm-workspace.yaml', async () => {
    vol.fromJSON({
      'pnpm-workspace.yaml': `
blockExoticSubdeps: false
ignorePatchFailures: true
strictDepBuilds: false
packageManagerStrictVersion: false`,
    });

    const result = await patchPnpmWorkspace('format');

    expect(result).toEqual({
      ok: true,
      fixable: false,
      annotations: [],
    });

    expect(volToJson()['pnpm-workspace.yaml']).toMatchInlineSnapshot(`
      "blockExoticSubdeps: true # Managed by skuba
      ignorePatchFailures: false # Managed by skuba
      strictDepBuilds: false # Managed by skuba
      packageManagerStrictVersion: true # Managed by skuba
      allowBuilds:
        '@ast-grep/lang-json': true # Managed by skuba
        '@ast-grep/lang-yaml': true # Managed by skuba
        '@datadog/native-appsec': true # Managed by skuba
        '@datadog/native-iast-taint-tracking': true # Managed by skuba
        '@datadog/native-metrics': true # Managed by skuba
        '@datadog/pprof': true # Managed by skuba
        dd-trace: true # Managed by skuba
        esbuild: true # Managed by skuba
        protobufjs: true # Managed by skuba
        unix-dgram: true # Managed by skuba
        unrs-resolver: true # Managed by skuba
      minimumReleaseAge: 4320 # Managed by skuba
      minimumReleaseAgeExclude:
        - '@seek/*' # Managed by skuba
        - '@skuba-lib/*' # Managed by skuba
        - eslint-config-seek # Managed by skuba
        - eslint-config-skuba # Managed by skuba
        - eslint-plugin-skuba # Managed by skuba
        - pnpm-plugin-skuba # Managed by skuba
        - skuba # Managed by skuba
        - skuba-dive # Managed by skuba
        - tsconfig-seek # Managed by skuba
      publicHoistPattern:
        - '@arethetypeswrong/core' # Managed by skuba
        - '@eslint/*' # Managed by skuba
        - '@types*' # Managed by skuba
        - esbuild # Managed by skuba
        - eslint # Managed by skuba
        - eslint-config-skuba # Managed by skuba
        - jest # Managed by skuba
        - prettier # Managed by skuba
        - publint # Managed by skuba
        - rolldown # Managed by skuba
        - tsconfig-seek # Managed by skuba
        - tsdown # Managed by skuba
        - typescript # Managed by skuba
      trustPolicy: off # Managed by skuba
      trustPolicyExclude:
        - semver@5.7.2 || 6.3.1 # Managed by skuba"
    `);
  });

  it('should handle missing items in arrays in pnpm-workspace.yaml', async () => {
    vol.fromJSON({
      'pnpm-workspace.yaml': `
publicHoistPattern:
  - some-package
  - esbuild
  - eslint-config-skuba # Managed by skuba
  - jest
trustPolicyExclude:
  - some-package@1.0.0
  - semver@5.7.2 || 6.3.1`,
    });

    const result = await patchPnpmWorkspace('format');

    expect(result).toEqual({
      ok: true,
      fixable: false,
      annotations: [],
    });

    expect(volToJson()['pnpm-workspace.yaml']).toMatchInlineSnapshot(`
      "publicHoistPattern:
        - some-package
        - esbuild # Managed by skuba
        - eslint-config-skuba # Managed by skuba
        - jest # Managed by skuba
        - '@arethetypeswrong/core' # Managed by skuba
        - '@eslint/*' # Managed by skuba
        - '@types*' # Managed by skuba
        - eslint # Managed by skuba
        - prettier # Managed by skuba
        - publint # Managed by skuba
        - rolldown # Managed by skuba
        - tsconfig-seek # Managed by skuba
        - tsdown # Managed by skuba
        - typescript # Managed by skuba
      trustPolicyExclude:
        - some-package@1.0.0
        - semver@5.7.2 || 6.3.1 # Managed by skuba
      allowBuilds:
        '@ast-grep/lang-json': true # Managed by skuba
        '@ast-grep/lang-yaml': true # Managed by skuba
        '@datadog/native-appsec': true # Managed by skuba
        '@datadog/native-iast-taint-tracking': true # Managed by skuba
        '@datadog/native-metrics': true # Managed by skuba
        '@datadog/pprof': true # Managed by skuba
        dd-trace: true # Managed by skuba
        esbuild: true # Managed by skuba
        protobufjs: true # Managed by skuba
        unix-dgram: true # Managed by skuba
        unrs-resolver: true # Managed by skuba
      blockExoticSubdeps: true # Managed by skuba
      ignorePatchFailures: false # Managed by skuba
      minimumReleaseAge: 4320 # Managed by skuba
      minimumReleaseAgeExclude:
        - '@seek/*' # Managed by skuba
        - '@skuba-lib/*' # Managed by skuba
        - eslint-config-seek # Managed by skuba
        - eslint-config-skuba # Managed by skuba
        - eslint-plugin-skuba # Managed by skuba
        - pnpm-plugin-skuba # Managed by skuba
        - skuba # Managed by skuba
        - skuba-dive # Managed by skuba
        - tsconfig-seek # Managed by skuba
      packageManagerStrictVersion: true # Managed by skuba
      strictDepBuilds: false # Managed by skuba
      trustPolicy: off # Managed by skuba"
    `);
  });
});
