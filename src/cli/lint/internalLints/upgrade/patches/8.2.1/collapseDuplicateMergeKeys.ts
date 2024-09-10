import { inspect } from 'util';

import { glob } from 'fast-glob';
import { promises as fs } from 'fs-extra';

import type { PatchFunction, PatchReturnType } from '../..';
import { log } from '../../../../../../utils/logging';

const collapseDuplicateMergeKeys: PatchFunction = async ({
  mode,
}): Promise<PatchReturnType> => {
  const buildkiteFiles = await glob(
    ['.buildkite/**/*.yml', '.buildkite/**/*.yaml'],
    { onlyFiles: true },
  );

  if (buildkiteFiles.length === 0) {
    return { result: 'skip', reason: 'no Buildkite files found' };
  }

  const input = await Promise.all(
    buildkiteFiles.map((name) => fs.readFile(name, 'utf-8')),
  );

  const replaced = input.map(collapseDuplicateMergeKeysInFile);

  if (replaced.every((r, i) => r === input[i])) {
    return { result: 'skip', reason: 'no duplicate merge keys found' };
  }

  if (mode === 'lint') {
    return { result: 'apply' };
  }

  await Promise.all(
    buildkiteFiles
      .map((name, i) => [name, i] as const)
      .filter(([, i]) => replaced[i] !== input[i])
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      .map(([name, i]) => fs.writeFile(name, replaced[i]!)),
  );

  return { result: 'apply' };
};

const collapseDuplicateMergeKeysInFile = (input: string) =>
  replaceAllUntilStable(
    input,
    /^([ \-]*)<<: \[?(\*[^\n\]]+)\]?$\n^( *)<<: \[?(\*[^\n\]]+)\]?$/gm,
    (match, a, b, c, d) => {
      if (a.length === c.length) {
        return `${a}<<: [${b}, ${d}]`;
      }
      return match;
    },
  );

const replaceAllUntilStable = (
  input: string,
  searchValue: RegExp,
  replacer: (substring: string, ...args: string[]) => string,
): string => {
  let output = input;
  let previousOutput;

  do {
    previousOutput = output;
    output = output.replace(searchValue, replacer);
  } while (output !== previousOutput);

  return output;
};

export const tryCollapseDuplicateMergeKeys: PatchFunction = async (config) => {
  try {
    return await collapseDuplicateMergeKeys(config);
  } catch (err) {
    log.warn('Failed to collapse duplicate merge keys.');
    log.subtle(inspect(err));
    return { result: 'skip', reason: 'due to an error' };
  }
};
