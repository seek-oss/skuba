import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

import { copy } from 'fs-extra';
import git from 'isomorphic-git';
import { diff } from 'jest-diff';

import { format } from './format';

jest.setTimeout(15_000);

const consoleLog = jest.spyOn(console, 'log').mockImplementation();

const SOURCE_FILES = ['a/a/a.ts', 'b.md', 'c.json', 'd.js'];

const BASE_PATH = path.join(__dirname, '..', '..', 'integration', 'base');

const TEMP_PATH = path.join(__dirname, '..', '..', 'integration', 'format');

const consoleLogCalls = (randomMatcher: RegExp) =>
  consoleLog.mock.calls
    .map((call) => call.join(' '))
    .join('\n')
    .replace(/ in \d+(\.\d+)?s\./g, ' in <random>s.')
    .replace(randomMatcher, '<random>');

const gitAdd = (dir: string) =>
  Promise.all(
    SOURCE_FILES.map((filepath) =>
      git.add({
        dir,
        filepath,
        fs,
      }),
    ),
  );

const gitModifiedAndUnstaged = async (dir: string) => {
  const matrix = await git.statusMatrix({
    dir,
    filepaths: SOURCE_FILES,
    fs,
  });

  return matrix.flatMap(([filename, head, workdir, stage]) =>
    head === 1 && workdir === 2 && stage === 1 ? filename : [],
  );
};

const prepareTempDirectory = async (baseDir: string, tempDir: string) => {
  await copy(baseDir, tempDir, { recursive: true });

  process.chdir(tempDir);

  await git.init({
    dir: tempDir,
    fs,
  });

  await gitAdd(tempDir);

  const commitOid = await git.commit({
    author: { name: 'skuba' },
    committer: { name: 'skuba' },
    dir: tempDir,
    fs,
    message: 'Initial commit',
  });

  const entries = await git.walk({
    dir: tempDir,
    fs,
    // eslint-disable-next-line new-cap
    trees: [git.TREE({ ref: commitOid })],
    map: async (filename, [file]) => [filename, await file?.oid()],
  });

  return Object.fromEntries(entries);
};

const originalCwd = process.cwd();

beforeEach(jest.clearAllMocks);

afterAll(() => {
  // Restore the original working directory to avoid confusion in other tests.
  process.chdir(originalCwd);

  // Clean up temporary directories to avoid subsequent formatting and linting
  // warnings and to save on disk space. This can be commented out to inspect
  // the output.
  return fs.promises.rm(TEMP_PATH, {
    force: true,
    recursive: true,
  });
});

interface Args {
  args: string[];
  base: string;
  exitCode: number | undefined;
  modified: string[];
}

test.each`
  description     | args           | base           | exitCode     | modified
  ${'fixable'}    | ${[]}          | ${'fixable'}   | ${undefined} | ${['a/a/a.ts', 'b.md', 'c.json', 'd.js']}
  ${'ok'}         | ${[]}          | ${'ok'}        | ${undefined} | ${[]}
  ${'ok --debug'} | ${['--debug']} | ${'ok'}        | ${undefined} | ${[]}
  ${'unfixable'}  | ${[]}          | ${'unfixable'} | ${1}         | ${['a/a/a.ts']}
`('$description', async ({ args, base, exitCode, modified }: Args) => {
  const baseDir = path.join(BASE_PATH, base);

  const tempDir = path.join(
    TEMP_PATH,
    `${base}-${crypto.randomBytes(32).toString('hex')}`,
  );

  const originalFiles = await prepareTempDirectory(baseDir, tempDir);

  await expect(format(args)).resolves.toBeUndefined();

  expect(process.exitCode).toBe(exitCode);

  expect(consoleLogCalls(new RegExp(tempDir, 'g'))).toMatchSnapshot();

  await expect(gitModifiedAndUnstaged(tempDir)).resolves.toStrictEqual(
    modified,
  );

  const files = await Promise.all(
    modified.map(async (filename) => {
      const [oldFile, newFile] = await Promise.all([
        git.readBlob({
          dir: tempDir,
          fs,
          oid: originalFiles[filename],
        }),
        fs.promises.readFile(filename, 'utf8'),
      ]);

      return [
        filename,
        '-'.repeat(filename.length),
        diff(new TextDecoder().decode(oldFile.blob), newFile, {
          contextLines: 1,
          expand: false,
          omitAnnotationLines: true,
        }),
      ].join('\n');
    }),
  );

  expect(`\n${files.join('\n\n')}`).toMatchSnapshot();
});
