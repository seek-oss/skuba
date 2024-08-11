import { inspect } from 'util';

import fg from 'fast-glob';
import { readFile, writeFile } from 'fs-extra';

import type { PatchFunction, PatchReturnType } from '../..';
import { log } from '../../../../../../utils/logging';

const collapseDuplicateMergeKeys: PatchFunction = async ({
  mode,
}): Promise<PatchReturnType> => {
  const buildkiteFiles = await fg(['.buildkite/**/*'], { onlyFiles: true });

  if (buildkiteFiles.length === 0) {
    return { result: 'skip', reason: 'no Buildkite files found' };
  }

  const input = await Promise.all(
    buildkiteFiles.map((name) => readFile(name, 'utf-8')),
  );

  const replaced = await Promise.all(
    input.map(collapseDuplicateMergeKeysInFile),
  );

  if (replaced.every((r, i) => r === input[i])) {
    return { result: 'skip' };
  }

  if (mode === 'lint') {
    return { result: 'apply' };
  }

  await Promise.all(
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    buildkiteFiles.map((name, i) => writeFile(name, replaced[i]!)),
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

// TODO: write some tests
