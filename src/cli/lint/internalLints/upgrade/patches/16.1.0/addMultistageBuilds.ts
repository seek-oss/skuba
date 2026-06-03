import { inspect } from 'util';

import { type Edit, parseAsync } from '@ast-grep/napi';
import fg from 'fast-glob';
import fs from 'fs-extra';

import { log } from '../../../../../../utils/logging.js';
import { registerAstGrepLanguages } from '../../../registerAstGrepLanguages.js';
import type { PatchFunction, PatchReturnType } from '../../index.js';

const applyMultiStageBuildPatch = async (
  contents: string,
): Promise<string | null> => {
  // Fairly lazy check to bail out on the patch
  if (
    contents.includes('COPY --from=deps') ||
    contents.includes('RUN pnpm prune --prod')
  ) {
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

  const edits: Edit[] = [];

  const argEnd = argBaseImage.range().end.index;
  edits.push({
    startPos: argEnd,
    endPos: argEnd,
    insertedText:
      '\n\nFROM ${BASE_IMAGE} AS deps\n\nCOPY . .\n\nRUN pnpm prune --prod\nRUN pnpm install --offline --prod',
  });

  const copyPackageJson = astRoot.find({
    rule: {
      kind: 'command',
      regex: 'COPY --from=build /workdir/package\\.json',
    },
  });

  if (copyPackageJson) {
    const nodeModulesRange = copyNodeModules.range();
    const nodeModulesEndPos =
      contents[nodeModulesRange.end.index] === '\n'
        ? nodeModulesRange.end.index + 1
        : nodeModulesRange.end.index;
    edits.push({
      startPos: nodeModulesRange.start.index,
      endPos: nodeModulesEndPos,
      insertedText: '',
    });

    const packageJsonEnd = copyPackageJson.range().end.index;
    edits.push({
      startPos: packageJsonEnd,
      endPos: packageJsonEnd,
      insertedText: '\nCOPY --from=deps /workdir/node_modules node_modules',
    });
  } else {
    edits.push(
      copyNodeModules.replace(
        copyNodeModules.text().replace('--from=build', '--from=deps'),
      ),
    );
  }

  return astRoot.commitEdits(edits);
};

const tryPatchApiDockerfiles = async (config: {
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
        const newContents = await applyMultiStageBuildPatch(contents);
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

export const patchDockerfiles: PatchFunction = async (config) => {
  try {
    return await tryPatchApiDockerfiles(config);
  } catch (err) {
    log.warn('Failed to patch API dockerfiles');
    log.subtle(inspect(err));
    return { result: 'skip', reason: 'due to an error' };
  }
};
