import path from 'path';
import { inspect } from 'util';

import fs from 'fs-extra';

import type { PatchFunction, PatchReturnType } from '../..';
import { log } from '../../../../../../utils/logging';
import { NPMRC_LINES } from '../../../../../../utils/npmrc';
import { createDestinationFileReader } from '../../../../../configure/analysis/project';

const NPMRC_IGNORE_SECTION = `

# Ignore .npmrc. This is no longer managed by skuba as pnpm projects use a managed .npmrc.
# IMPORTANT: if migrating to pnpm, remove this line and add an .npmrc IN THE SAME COMMIT.
# You can use \`skuba format\` to generate the file or otherwise commit an empty file.
# Doing so will conflict with a local .npmrc and make it more difficult to unintentionally commit auth secrets.
.npmrc
`;

const moveNpmrcOutOfIgnoreManagedSection = async (
  mode: 'format' | 'lint',
  dir: string,
  fileName: '.gitignore' | '.dockerignore',
): Promise<PatchReturnType> => {
  const readFile = createDestinationFileReader(dir);

  const ignoreFile = await readFile(fileName);

  if (!ignoreFile) {
    return { result: 'skip', reason: `no ${fileName} file found` };
  }

  let isIgnored: { inManaged: boolean } | undefined;
  let currentlyInManagedSection = false;

  for (const line of ignoreFile.split('\n')) {
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

  const newIgnoreFile =
    ignoreFile
      .split('\n')
      .filter((line) => !NPMRC_LINES.includes(line.trim()))
      .join('\n')
      .trim() + NPMRC_IGNORE_SECTION;

  await fs.promises.writeFile(path.join(dir, fileName), newIgnoreFile);

  return { result: 'apply' };
};

export const tryMoveNpmrcOutOfIgnoreManagedSection = (
  type: '.gitignore' | '.dockerignore',
) =>
  (async ({ mode, dir = process.cwd() }) => {
    try {
      return await moveNpmrcOutOfIgnoreManagedSection(mode, dir, type);
    } catch (err) {
      log.warn(`Failed to move .npmrc out of ${type} managed sections.`);
      log.subtle(inspect(err));
      return { result: 'skip', reason: 'due to an error' };
    }
  }) satisfies PatchFunction;
