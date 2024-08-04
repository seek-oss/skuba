import crypto from 'crypto';
import path from 'path';

import fs, { copy } from 'fs-extra';
import git from 'isomorphic-git';
import { diff } from 'jest-diff';

import { format } from './format';

jest.setTimeout(15_000);

const stdoutMock = jest.fn();

jest
  .spyOn(console, 'log')
  .mockImplementation((...args) => stdoutMock(`${args.join(' ')}\n`));

jest
  .spyOn(git, 'listRemotes')
  .mockResolvedValue([
    { remote: 'origin', url: 'git@github.com:seek-oss/skuba.git' },
  ]);

const SOURCE_FILES = ['a/a/a.ts', 'b.md', 'c.json', 'd.js'];

const BASE_PATH = path.join(__dirname, '..', '..', 'integration', 'base');

const TEMP_PATH = path.join(__dirname, '..', '..', 'integration', 'format');

const stdout = (randomMatcher: RegExp) => {
  const result = stdoutMock.mock.calls
    .flat(1)
    .join('')
    .replace(/ in [\d\.]+s\./g, ' in <random>s.')
    .replace(randomMatcher, '<random>');

  return `\n${result}`;
};

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
  await copy(baseDir, tempDir);

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

beforeEach(() => {
  jest.clearAllMocks();

  // @ts-expect-error
  global.SKIP_ESLINT_IGNORE = true;

  process.exitCode = undefined;
});

afterAll(() => {
  process.exitCode = undefined;
  // @ts-expect-error
  delete global.SKIP_ESLINT_IGNORE;

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

  expect(stdout(new RegExp(tempDir, 'g'))).toMatchSnapshot();

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
        diff(Buffer.from(oldFile.blob).toString(), newFile, {
          contextLines: 1,
          expand: false,
          omitAnnotationLines: true,
        }),
      ].join('\n');
    }),
  );

  expect(`\n${files.join('\n\n')}`).toMatchSnapshot();

  expect(process.exitCode).toBe(exitCode);
});
