import path from 'path';
import { inspect } from 'util';

import * as Git from '@skuba-lib/api/git';
import fg from 'fast-glob';
import fs from 'fs-extra';

import { exec } from '../../../../../../utils/exec.js';
import { log } from '../../../../../../utils/logging.js';
import { detectPnpmMajorVersion } from '../../../../../../utils/pnpmVersion.js';
import { patchPnpmWorkspace } from '../../../patchPnpmWorkspace.js';
import type {
  PatchConfig,
  PatchFunction,
  PatchReturnType,
} from '../../index.js';

/**
 * `aws-cdk-lib`'s `NodejsFunction` writes an empty `pnpm-workspace.yaml` into
 * its bundling output directory before running `pnpm install`, which discards
 * the `allowBuilds` allowlist that pnpm v11 requires to run install scripts.
 *
 * @see https://github.com/aws/aws-cdk/issues/37898
 * @see https://github.com/pnpm/pnpm/issues/10988
 */
const usesCdkNodejsFunction = (contents: string): boolean =>
  /aws_lambda_nodejs\s*\.\s*NodejsFunction/.test(contents) ||
  (contents.includes('NodejsFunction') &&
    /['"]aws-cdk-lib\/aws-lambda-nodejs['"]/.test(contents));

const findCdkNodejsFunction = async (dir: string): Promise<boolean> => {
  const gitRoot = await Git.findRoot({ dir });
  const root = gitRoot ?? dir;

  const tsFiles = await fg('**/*.ts', {
    cwd: root,
    ignore: ['**/.git', '**/node_modules'],
  });

  const matches = await Promise.all(
    tsFiles.map(async (file) =>
      usesCdkNodejsFunction(
        await fs.promises.readFile(path.join(root, file), 'utf8'),
      ),
    ),
  );

  return matches.some(Boolean);
};

export const migratePnpmV11 = async ({
  mode,
  packageManager,
  dir = process.cwd(),
}: Pick<
  PatchConfig,
  'mode' | 'packageManager' | 'dir'
>): Promise<PatchReturnType> => {
  if (packageManager.command !== 'pnpm') {
    return {
      result: 'skip',
      reason: 'not a pnpm project',
    };
  }

  const major = await detectPnpmMajorVersion(dir);

  if (major !== undefined && major >= 11) {
    return {
      result: 'skip',
      reason: `already on pnpm v${major}`,
    };
  }

  if (await findCdkNodejsFunction(dir)) {
    return {
      result: 'skip',
      reason:
        'aws-cdk-lib NodejsFunction cannot bundle its dependencies under pnpm v11; see https://seek-oss.github.io/skuba/deep-dives/pnpm.html#lambdas-and-nodejsfunction',
    };
  }

  if (mode === 'lint') {
    return {
      result: 'apply',
    };
  }

  await exec(
    'pnpm',
    '--config.minimumReleaseAge=4320',
    'dlx',
    'codemod',
    'run',
    'pnpm-v10-to-v11',
    '--no-interactive',
  );

  await patchPnpmWorkspace(mode);

  return {
    result: 'apply',
  };
};

export const tryMigratePnpmV11: PatchFunction = async (args) => {
  try {
    return await migratePnpmV11(args);
  } catch (err) {
    log.warn('Failed to run pnpm-v10-to-v11 codemod');
    log.subtle(inspect(err));
    return { result: 'skip', reason: 'due to an error' };
  }
};
