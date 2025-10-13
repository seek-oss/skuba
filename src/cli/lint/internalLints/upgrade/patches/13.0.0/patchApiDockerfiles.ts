import { inspect } from 'util';

import { glob } from 'fast-glob';
import fs from 'fs-extra';

import { log } from '../../../../../../utils/logging.js';
import type { PatchFunction, PatchReturnType } from '../../index.js';

const fetchFiles = async (files: string[]) =>
  Promise.all(
    files.map(async (file) => {
      const contents = await fs.promises.readFile(file, 'utf8');

      return {
        file,
        contents,
      };
    }),
  );

const applyDockerfilePatch = (contents: string) => {
  if (contents.includes('pnpm deploy')) {
    // Assume pnpm is going to bring in the package.json file
    return undefined;
  }

  const cmdLineRegex = /CMD\s+\[.*?\]/ms;
  const cmdLineMatch = cmdLineRegex.exec(contents);
  const cmdLine = cmdLineMatch?.[0];

  if (!cmdLine) {
    return undefined;
  }

  // Extract the lib path from CMD line
  // Match patterns like "./lib/", "apps/api/lib/", "lib/"
  const libPathRegex = /"([^"]*\/)?lib\/[^"]*"/;
  const libPathMatch = libPathRegex.exec(cmdLine);

  if (!libPathMatch) {
    return undefined;
  }

  const fullPath = libPathMatch[1] || './';
  const libParentPath = fullPath.endsWith('/')
    ? fullPath.slice(0, -1)
    : fullPath;

  // If the path is empty or just './', the lib is in current directory
  const normalizedPath =
    libParentPath === '.' || libParentPath === '' ? '.' : libParentPath;

  // Try to find COPY with --from first
  const copyNodeModulesWithFromRegex =
    /^\s*COPY\s+--from=(\S+)\s+.*node_modules.*$/m;
  const copyNodeModulesWithFromMatch =
    copyNodeModulesWithFromRegex.exec(contents);

  // If no --from, try to find COPY without --from
  const copyNodeModulesWithoutFromRegex =
    /^\s*COPY\s+(?!--from).*node_modules.*$/m;
  const copyNodeModulesWithoutFromMatch =
    copyNodeModulesWithoutFromRegex.exec(contents);

  const copyNodeModulesMatch =
    copyNodeModulesWithFromMatch ?? copyNodeModulesWithoutFromMatch;
  const copyNodeModulesLine = copyNodeModulesMatch?.[0];
  const fromSource = copyNodeModulesWithFromMatch?.[1];

  if (!copyNodeModulesLine) {
    return undefined;
  }

  // Check if package.json is already being copied for this path
  const packageJsonPattern = normalizedPath === '.' ? '' : `${normalizedPath}/`;
  const packageJsonCopyPattern = fromSource
    ? new RegExp(
        `^\\s*COPY\\s+--from=${fromSource}\\s+.*${packageJsonPattern}package\\.json`,
        'm',
      )
    : new RegExp(
        `^\\s*COPY\\s+(?!--from).*${packageJsonPattern}package\\.json`,
        'm',
      );

  if (packageJsonCopyPattern.test(contents)) {
    return undefined;
  }

  let packageJsonCopyLine: string;
  if (fromSource) {
    packageJsonCopyLine =
      normalizedPath === '.'
        ? `COPY --from=${fromSource} /workdir/package.json package.json`
        : `COPY --from=${fromSource} /workdir/${normalizedPath}/package.json ${normalizedPath}/package.json`;
  } else {
    packageJsonCopyLine =
      normalizedPath === '.'
        ? 'COPY package.json package.json'
        : `COPY ${normalizedPath}/package.json ${normalizedPath}/package.json`;
  }

  const newContents = contents.replace(
    copyNodeModulesLine,
    `${copyNodeModulesLine}\n${packageJsonCopyLine}`,
  );

  return newContents;
};

const tryPatchApiDockerfiles = async (config: {
  mode: 'lint' | 'format';
}): Promise<PatchReturnType> => {
  const dockerfilePaths = await glob(['**/Dockerfile*'], {
    ignore: ['**/.git', '**/node_modules'],
  });

  if (dockerfilePaths.length === 0) {
    return {
      result: 'skip',
      reason: 'no Dockerfiles found',
    };
  }

  const dockerfiles = await fetchFiles(dockerfilePaths);

  const dockerFilesToPatch = dockerfiles.flatMap(({ file, contents }) => {
    const newContents = applyDockerfilePatch(contents);
    if (!newContents || newContents === contents) {
      return [];
    }

    return [
      {
        file,
        contents: newContents,
      },
    ];
  });

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

export const patchApiDockerfiles: PatchFunction = async (config) => {
  try {
    return await tryPatchApiDockerfiles(config);
  } catch (err) {
    log.warn('Failed to patch API dockerfiles');
    log.subtle(inspect(err));
    return { result: 'skip', reason: 'due to an error' };
  }
};
