import path from 'path';
import { inspect } from 'util';

import fs from 'fs-extra';

import type { PatchFunction, PatchReturnType } from '../..';
import { log } from '../../../../../utils/logging';
import { createDestinationFileReader } from '../../../analysis/project';

const NPMRC_IGNORE_SECTION = `

# Ignore .npmrc. Previously managed by skuba, but removed as pnpm projects require a managed .npmrc.
# If migrating to pnpm, remove this line.
# IMPORTANT: Ensure you add a .npmrc file IN THE SAME COMMIT to avoid secret exposure.
# skuba can generate an .npmrc for you with \`skuba format\` if you move to pnpm - but committing an empty file is sufficient for security reasons.
.npmrc
`;

const moveNpmrcOutOfGitignoreManagedSection = async (
  mode: 'format' | 'lint',
  dir: string,
): Promise<PatchReturnType> => {
  const readFile = createDestinationFileReader(dir);

  const gitignore = await readFile('.gitignore');

  if (!gitignore) {
    return { result: 'skip', reason: 'no .gitignore file found' };
  }

  let isIgnored: { inManaged: boolean } | undefined;
  let currentlyInManagedSection = false;

  for (const line of gitignore.split('\n')) {
    if (line.trim() === '# managed by skuba') {
      currentlyInManagedSection = true;
    } else if (line.trim() === '# end managed by skuba') {
      currentlyInManagedSection = false;
    }

    if (line.trim() === '.npmrc' || line.trim() === '/.npmrc') {
      isIgnored = { inManaged: currentlyInManagedSection };
    }

    if (line.trim() === '!.npmrc' || line.trim() === '!/.npmrc') {
      isIgnored = undefined;
    }
  }

  if (isIgnored && !isIgnored.inManaged) {
    return { result: 'skip', reason: 'already ignored in unmanaged section' };
  }

  if (!isIgnored) {
    return { result: 'skip', reason: 'not ignored' };
  }

  if (mode === 'lint') {
    return { result: 'apply' };
  }

  const newGitignore =
    gitignore
      .split('\n')
      .filter((line) => line.trim().replace(/^[!/]+/g, '') !== '.npmrc')
      .join('\n')
      .trim() + NPMRC_IGNORE_SECTION;

  await fs.promises.writeFile(path.join(dir, '.gitignore'), newGitignore);

  return { result: 'apply' };
};

export const tryMoveNpmrcOutOfGitignoreManagedSection = (async (
  mode: 'format' | 'lint',
  dir = process.cwd(),
) => {
  try {
    return await moveNpmrcOutOfGitignoreManagedSection(mode, dir);
  } catch (err) {
    log.warn('Failed to move .npmrc out of .gitignore managed section.');
    log.subtle(inspect(err));
    return { result: 'skip', reason: 'due to an error' };
  }
}) satisfies PatchFunction;
