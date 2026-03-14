import memfs, { vol } from 'memfs';

import { configForPackageManager } from '../../../../../../utils/packageManager.js';
import type { PatchConfig, PatchReturnType } from '../../index.js';

import { removePnpmPlugin } from './removePnpmPlugin.js';

jest.mock('../../../../../../utils/exec.js');
jest.mock('fs-extra', () => memfs);
jest.mock('fast-glob', () => ({
  glob: (pat: string, opts: { ignore: string[] }) =>
    jest.requireActual('fast-glob').glob(pat, { ...opts, fs: memfs }),
}));

const volToJson = () => vol.toJSON(process.cwd(), undefined, true);

beforeEach(() => {
  vol.reset();
  jest.clearAllMocks();
});

const baseArgs: PatchConfig = {
  manifest: {
    packageJson: {
      name: 'test',
      version: '1.0.0',
      readme: 'README.md',
      _id: 'test',
    },
    path: 'package.json',
  },
  packageManager: configForPackageManager('yarn'),
  mode: 'format',
};

describe('removePnpmPlugin', () => {
  it('should skip if pnpm-workspace.yaml is up to date', async () => {
    vol.fromJSON({
      'pnpm-workspace.yaml': `publicHoistPattern:
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
strictDepBuilds: true # Managed by skuba
trustPolicy: no-downgrade # Managed by skuba
`,
    });

    await expect(
      removePnpmPlugin({
        ...baseArgs,
        mode: 'lint',
      }),
    ).resolves.toEqual<PatchReturnType>({
      result: 'skip',
      reason: 'pnpm-workspace.yaml has already been migrated',
    });
  });

  it('should not apply changes in lint mode', async () => {
    vol.fromJSON({
      'pnpm-workspace.yaml': ``,
    });

    await expect(
      removePnpmPlugin({
        ...baseArgs,
        mode: 'lint',
      }),
    ).resolves.toEqual<PatchReturnType>({
      result: 'apply',
    });

    expect(volToJson()).toMatchInlineSnapshot(`
      {
        "pnpm-workspace.yaml": "",
      }
    `);
  });

  it('should apply changes in format mode', async () => {
    vol.fromJSON({
      'pnpm-workspace.yaml': `configDependencies:
  pnpm-plugin-skuba: 2.0.0+sha512-nhxd9TdhOOXJ1bcQaqtDiI02gbxhJ8lTw3ZzSHDJPqIbbtnABQT7nLKqLX2zKi7tbfRI8+QSgL3eR2d/QFOLew==
`,
    });

    await expect(
      removePnpmPlugin({
        ...baseArgs,
        mode: 'format',
      }),
    ).resolves.toEqual<PatchReturnType>({
      result: 'apply',
    });

    expect(volToJson()).toMatchInlineSnapshot(`
      {
        "pnpm-workspace.yaml": "

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
      strictDepBuilds: true # Managed by skuba
      trustPolicy: no-downgrade # Managed by skuba
      trustPolicyExclude:
        - semver@5.7.2 || 6.3.1 # Managed by skuba",
      }
    `);
  });

  it('should remove only pnpm-plugin-skuba if there are other configDependencies', async () => {
    vol.fromJSON({
      'pnpm-workspace.yaml': `packages:
  - .
configDependencies:
  pnpm-plugin-skuba: 2.0.0+sha512-nhxd9TdhOOXJ1bcQaqtDiI02gbxhJ8lTw3ZzSHDJPqIbbtnABQT7nLKqLX2zKi7tbfRI8+QSgL3eR2d/QFOLew==
`,
    });

    await expect(
      removePnpmPlugin({
        ...baseArgs,
        mode: 'format',
      }),
    ).resolves.toEqual<PatchReturnType>({
      result: 'apply',
    });

    expect(volToJson()).toMatchInlineSnapshot(`
      {
        "pnpm-workspace.yaml": "packages:
        - .


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
      strictDepBuilds: true # Managed by skuba
      trustPolicy: no-downgrade # Managed by skuba
      trustPolicyExclude:
        - semver@5.7.2 || 6.3.1 # Managed by skuba",
      }
    `);
  });
});
