import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import memfs, { vol } from 'memfs';

import { configForPackageManager } from '../../../../../../utils/packageManager.js';
import type { PatchConfig } from '../../index.js';

import {
  hasAppImportRegex,
  tryStopBundlingInCDKTests,
} from './stopBundlingInCDKTests.js';

const volToJson = () => vol.toJSON(process.cwd(), undefined, true);

vi.mock('fs', () => memfs);
vi.mock('fast-glob', async () => ({
  glob: async (pat: any, opts: any) =>
    await vi.importActual('fast-glob').glob(pat, { ...opts, fs: memfs }),
}));

beforeEach(() => vol.reset());

describe('stopBundlingInCDKTests', () => {
  const baseArgs = {
    manifest: {} as PatchConfig['manifest'],
    packageManager: configForPackageManager('yarn'),
  };

  afterEach(() => vi.resetAllMocks());

  describe.each(['lint', 'format'] as const)('%s', (mode) => {
    it('should skip if no CDK test files are found', async () => {
      await expect(
        tryStopBundlingInCDKTests({
          ...baseArgs,
          mode,
        }),
      ).resolves.toEqual({
        result: 'skip',
        reason: 'no CDK test files found',
      });

      expect(volToJson()).toEqual({});
    });

    it('should skip if no App import is found from aws-cdk-lib', async () => {
      const input = `const myApp = new App();`;

      vol.fromJSON({
        'apps/my-worker/infra/myWorkerStack.test.ts': input,
      });

      await expect(
        tryStopBundlingInCDKTests({
          ...baseArgs,
          mode,
        }),
      ).resolves.toEqual({
        result: 'skip',
        reason: 'no CDK test files need patching',
      });

      expect(volToJson()).toEqual({
        'apps/my-worker/infra/myWorkerStack.test.ts': input,
      });
    });

    it('should patch a detected bare App() constructor', async () => {
      const input = `import { App } from "aws-cdk-lib";\nconst app = new App();\n\nother stuff\n\nconst secondApp = new App();`;

      const inputVolume = {
        'infra/myWorkerStack.test.ts': input,
      };

      vol.fromJSON(inputVolume);

      await expect(
        tryStopBundlingInCDKTests({
          ...baseArgs,
          mode,
        }),
      ).resolves.toEqual({
        result: 'apply',
      });

      expect(volToJson()).toEqual(
        mode === 'lint'
          ? inputVolume
          : {
              'infra/myWorkerStack.test.ts': `import { App } from "aws-cdk-lib";\nconst app = new App({ context: { 'aws:cdk:bundling-stacks': [] } });\n\nother stuff\n\nconst secondApp = new App({ context: { 'aws:cdk:bundling-stacks': [] } });`,
            },
      );
    });
  });
});

describe('hasAppImportRegex', () => {
  it.each([
    ['Bare', 'import { App } from "aws-cdk-lib";'],
    ['Others after', 'import { App, aws_sns, aws_sqs } from "aws-cdk-lib";'],
    [
      'Surrounded',
      "import { aws_sns, App, aws_secretsmanager } from 'aws-cdk-lib';",
    ],
    ['Other before', 'import { aws_sns, App } from "aws-cdk-lib";'],
    ['newline', 'import { App\n} from "aws-cdk-lib";'],
    [
      'newline surrounded',
      'import {\n  aws_secretsmanager\n,  App\n, aws_sns\n} from "aws-cdk-lib";',
    ],
  ])('should match %s', (_, input: string) => {
    expect(input).toMatch(hasAppImportRegex);
  });

  it.each([
    ['No App', 'import { aws_sns } from "aws-cdk-lib";'],
    ['Other import', 'import { aws_sns } from "aws-cdk-lib";'],
    ['Other lib', 'import { App } from "aws-some-other-lib";'],
    [
      'App on one line and then aws-cdk-lib on another',
      'import { App } from "some-lib";\nimport { aws_sns } from "aws-cdk-lib";',
    ],
  ])('should not match %s', (_, input: string) => {
    expect(input).not.toMatch(hasAppImportRegex);
  });
});
