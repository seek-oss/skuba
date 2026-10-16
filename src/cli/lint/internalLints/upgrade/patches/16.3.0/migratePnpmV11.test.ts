import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import memfs, { vol } from '../../../../../../testing/memfs.js';
import { exec } from '../../../../../../utils/exec.js';
import type { PatchReturnType } from '../../index.js';

import { migratePnpmV11 } from './migratePnpmV11.js';

vi.mock('../../../../../../utils/exec.js');
vi.mock('fs-extra', () => ({
  default: memfs,
  ...memfs,
}));

vi.mock('@skuba-lib/api/git', async () => ({
  ...(await vi.importActual<object>('@skuba-lib/api/git')),
  findRoot: vi.fn(),
}));
import * as Git from '@skuba-lib/api/git';

vi.mock('../../../patchPnpmWorkspace.js');

const findRoot = vi.mocked(Git.findRoot);
const execMock = vi.mocked(exec);

const NODEJS_FUNCTION_SKIP_REASON =
  'aws-cdk-lib NodejsFunction cannot bundle its dependencies under pnpm v11; see https://seek-oss.github.io/skuba/deep-dives/pnpm.html#lambdas-and-nodejsfunction';

describe('migratePnpmV11', () => {
  afterEach(() => {
    vi.resetAllMocks();
    vol.reset();
  });

  beforeEach(async () => {
    await vol.promises.mkdir(process.cwd(), { recursive: true });
    findRoot.mockResolvedValue(process.cwd());
  });

  it('should skip if not a pnpm project', async () => {
    await expect(
      migratePnpmV11({
        mode: 'format',
        packageManager: { command: 'yarn' },
      }),
    ).resolves.toEqual({
      result: 'skip',
      reason: 'not a pnpm project',
    } satisfies PatchReturnType);

    expect(execMock).not.toHaveBeenCalled();
  });

  it('should skip if a NodejsFunction is imported from aws-cdk-lib', async () => {
    vol.fromJSON(
      {
        'infra/appStack.ts': `import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';

const worker = new NodejsFunction(this, 'worker', {});
`,
      },
      process.cwd(),
    );

    await expect(
      migratePnpmV11({
        mode: 'format',
        packageManager: { command: 'pnpm' },
      }),
    ).resolves.toEqual({
      result: 'skip',
      reason: NODEJS_FUNCTION_SKIP_REASON,
    } satisfies PatchReturnType);

    expect(execMock).not.toHaveBeenCalled();
  });

  it('should skip if a NodejsFunction is namespaced under aws_lambda_nodejs', async () => {
    vol.fromJSON(
      {
        'infra/appStack.ts': `import { aws_lambda_nodejs } from 'aws-cdk-lib';

const worker = new aws_lambda_nodejs.NodejsFunction(this, 'worker', {});
`,
      },
      process.cwd(),
    );

    await expect(
      migratePnpmV11({
        mode: 'lint',
        packageManager: { command: 'pnpm' },
      }),
    ).resolves.toEqual({
      result: 'skip',
      reason: NODEJS_FUNCTION_SKIP_REASON,
    } satisfies PatchReturnType);

    expect(execMock).not.toHaveBeenCalled();
  });

  it('should not skip for the skuba NodejsFunction construct', async () => {
    vol.fromJSON(
      {
        'infra/appStack.ts': `import { Cdk } from '@skuba-lib/api';

const worker = new Cdk.NodejsFunction(this, 'worker', {});
`,
      },
      process.cwd(),
    );

    await expect(
      migratePnpmV11({
        mode: 'lint',
        packageManager: { command: 'pnpm' },
      }),
    ).resolves.toEqual({
      result: 'apply',
    } satisfies PatchReturnType);
  });

  it('should return apply and not run codemod if mode is lint', async () => {
    await expect(
      migratePnpmV11({
        mode: 'lint',
        packageManager: { command: 'pnpm' },
      }),
    ).resolves.toEqual({
      result: 'apply',
    } satisfies PatchReturnType);

    expect(execMock).not.toHaveBeenCalled();
  });

  it('should run the codemod and return apply if mode is format', async () => {
    await expect(
      migratePnpmV11({
        mode: 'format',
        packageManager: { command: 'pnpm' },
      }),
    ).resolves.toEqual({
      result: 'apply',
    } satisfies PatchReturnType);

    expect(execMock).toHaveBeenCalledWith(
      'pnpm',
      '--config.minimumReleaseAge=4320',
      'dlx',
      'codemod',
      'run',
      'pnpm-v10-to-v11',
      '--no-interactive',
    );
    expect(execMock).toHaveBeenCalledTimes(1);
  });

  it('should align packageManager in nested package.json files with the root', async () => {
    vol.fromJSON(
      {
        'package.json': '{\n  "packageManager": "pnpm@11.1.0+sha512-abc"\n}\n',
        'packages/a/package.json':
          '{\n  "name": "a",\n  "packageManager": "pnpm@10.26.1"\n}\n',
        'packages/b/package.json': '{\n  "name": "b"\n}\n',
        'packages/c/package.json':
          '{\n  "name": "c",\n  "packageManager": "yarn@4.0.0"\n}\n',
        'node_modules/dep/package.json':
          '{\n  "packageManager": "pnpm@9.0.0"\n}\n',
      },
      process.cwd(),
    );

    await migratePnpmV11({
      mode: 'format',
      packageManager: { command: 'pnpm' },
    });

    const read = (file: string) =>
      vol.promises.readFile(`${process.cwd()}/${file}`, 'utf8');

    await expect(read('packages/a/package.json')).resolves.toBe(
      '{\n  "name": "a",\n  "packageManager": "pnpm@11.1.0+sha512-abc"\n}\n',
    );
    await expect(read('packages/b/package.json')).resolves.toBe(
      '{\n  "name": "b"\n}\n',
    );
    await expect(read('packages/c/package.json')).resolves.toBe(
      '{\n  "name": "c",\n  "packageManager": "yarn@4.0.0"\n}\n',
    );
    await expect(read('node_modules/dep/package.json')).resolves.toBe(
      '{\n  "packageManager": "pnpm@9.0.0"\n}\n',
    );
  });
});
