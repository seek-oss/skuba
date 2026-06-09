import { inspect } from 'util';

import { type Edit, parseAsync } from '@ast-grep/napi';
import fg from 'fast-glob';
import fs from 'fs-extra';

import { log } from '../../../../../../utils/logging.js';
import { registerAstGrepLanguages } from '../../../registerAstGrepLanguages.js';
import type { PatchFunction, PatchReturnType } from '../../index.js';

const applyPruneDevDepsPatch = async (
  contents: string,
): Promise<string | null> => {
  // Fairly lazy check to bail out on the patch
  if (contents.includes('pnpm prune --prod')) {
    return null;
  }

  registerAstGrepLanguages();
  const astRoot = (await parseAsync('bash', contents)).root();

  const argBaseImage = astRoot.find({
    rule: {
      kind: 'command',
      regex: '^ARG BASE_IMAGE',
    },
  });
  if (!argBaseImage) {
    return null;
  }

  const copyNodeModules = astRoot.find({
    rule: {
      kind: 'command',
      regex: 'COPY --from=build /workdir/node_modules',
    },
  });
  if (!copyNodeModules) {
    return null;
  }

  const installOffline = astRoot.find({
    rule: {
      kind: 'command',
      regex: '^RUN pnpm install --offline$',
    },
  });
  if (!installOffline) {
    return null;
  }

  const pnpmBuild = astRoot.find({
    rule: {
      kind: 'command',
      regex: '^RUN pnpm build$',
    },
  });
  if (!pnpmBuild) {
    return null;
  }

  const edits: Edit[] = [
    pnpmBuild.replace(
      'RUN pnpm build\nRUN pnpm prune --prod\nRUN pnpm install --offline --prod',
    ),
  ];

  return astRoot.commitEdits(edits);
};

const tryPruneDevDeps = async (config: {
  mode: 'lint' | 'format';
}): Promise<PatchReturnType> => {
  const dockerfilePaths = await fg(['**/Dockerfile*'], {
    ignore: ['**/.git', '**/node_modules'],
  });

  if (dockerfilePaths.length === 0) {
    return {
      result: 'skip',
      reason: 'no Dockerfiles found',
    };
  }

  const dockerfiles = await Promise.all(
    dockerfilePaths.map(async (file) => {
      const contents = await fs.promises.readFile(file, 'utf8');
      return {
        file,
        contents,
      };
    }),
  );

  const dockerFilesToPatch = (
    await Promise.all(
      dockerfiles.map(async ({ file, contents }) => {
        const newContents = await applyPruneDevDepsPatch(contents);
        if (!newContents || newContents === contents) {
          return null;
        }
        return {
          file,
          contents: newContents,
        };
      }),
    )
  ).filter((item) => item !== null);

  if (dockerFilesToPatch.length === 0) {
    return {
      result: 'skip',
      reason: 'no Dockerfiles to patch',
    };
  }

  if (config.mode === 'lint') {
    return {
      result: 'apply',
    };
  }

  await Promise.all(
    dockerFilesToPatch.map(({ file, contents }) =>
      fs.promises.writeFile(file, contents, 'utf8'),
    ),
  );

  return {
    result: 'apply',
  };
};

export const pruneDevDeps: PatchFunction = async (config) => {
  try {
    return await tryPruneDevDeps(config);
  } catch (err) {
    log.warn('Failed to patch API dockerfiles');
    log.subtle(inspect(err));
    return { result: 'skip', reason: 'due to an error' };
  }
};
