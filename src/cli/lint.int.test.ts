import crypto from 'crypto';
import path from 'path';
import stream from 'stream';
import { inspect } from 'util';

import fs, { copy } from 'fs-extra';
import type Git from 'isomorphic-git' with { 'resolution-mode': 'import' };

import { Buildkite } from '..';
import type { Logger } from '../utils/logging';
import { getSkubaVersion } from '../utils/version';

import { refreshConfigFiles } from './lint/internalLints/refreshConfigFiles';
import { lint } from './lint/lint';

jest.setTimeout(30_000);

jest.mock('../utils/version');

const buildkiteAnnotate = jest.spyOn(Buildkite, 'annotate').mockResolvedValue();

const stdoutMock = jest.fn();

const git = jest.requireActual<typeof Git>('isomorphic-git');
jest
  .spyOn(console, 'log')
  .mockImplementation((...args) => stdoutMock(`${args.join(' ')}\n`));

jest
  .spyOn(git, 'listRemotes')
  .mockResolvedValue([
    { remote: 'origin', url: 'git@github.com:seek-oss/skuba.git' },
  ]);

const tscOutputStream = new stream.PassThrough().on('data', stdoutMock);

const BASE_PATH = path.join(__dirname, '..', '..', 'integration', 'base');

const TEMP_PATH = path.join(__dirname, '..', '..', 'integration', 'lint');

const stdout = (randomMatcher: RegExp) => {
  const result = stdoutMock.mock.calls
    .flat(1)
    .join('')
    .replace(/ in [\d\.]+s\./g, ' in <random>s.')
    .replace(
      /tsc      │ Lines of ([^:]+):[ ]+\d+/g,
      'tsc      │ Lines of $1: <random>',
    )
    .replace(
      /tsc      │ Nodes of ([^:]+):[ ]+\d+/g,
      'tsc      │ Nodes of $1: <random>',
    )
    .replace(
      /tsc      │ (Files|Identifiers|Symbols|Types|Instantiations|Memory used):[ ]+\d+/g,
      'tsc      │ $1: <random>',
    )
    .replace(
      /tsc      │ (.+) cache size:[ ]+\d+/g,
      'tsc      │ $1 cache size: <random>',
    )
    .replace(
      /tsc      │ (.+) time:[ ]+[\d\.]+s/g,
      'tsc      │ $1 time: <random>s',
    )
    .replace(randomMatcher, '<random>');

  return `\n${result}`;
};

const prepareTempDirectory = async (baseDir: string, tempDir: string) => {
  await copy(baseDir, tempDir);
  process.chdir(tempDir);
  await git.init({ fs, dir: tempDir });
  const result = await refreshConfigFiles('format', {
    bold: jest.fn(),
    dim: jest.fn(),
    warn: jest.fn(),
  } as unknown as Logger);
  expect(result.ok).toBe(true);
};

const originalCwd = process.cwd();

beforeAll(() => {
  delete process.env.BUILDKITE;
  delete process.env.CI;
  delete process.env.GITHUB_ACTIONS;
});

beforeEach(() => {
  jest.clearAllMocks();

  process.exitCode = undefined;
});

afterAll(() => {
  process.exitCode = undefined;

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
  skubaVersion: string;
  exitCode: number | undefined;
}

test.each`
  description        | args           | base           | skubaVersion | exitCode
  ${'fixable'}       | ${[]}          | ${'fixable'}   | ${'0.0.0'}   | ${1}
  ${'ok'}            | ${[]}          | ${'ok'}        | ${'0.0.0'}   | ${undefined}
  ${'ok --debug'}    | ${['--debug']} | ${'ok'}        | ${'0.0.0'}   | ${undefined}
  ${'unfixable'}     | ${[]}          | ${'unfixable'} | ${'0.0.0'}   | ${1}
  ${'needs patches'} | ${[]}          | ${'patch'}     | ${'1.0.0'}   | ${1}
`('$description', async ({ args, base, skubaVersion, exitCode }: Args) => {
  jest.mocked(getSkubaVersion).mockResolvedValue(skubaVersion);

  const baseDir = path.join(BASE_PATH, base);

  const tempDir = path.join(
    TEMP_PATH,
    `${base}-${crypto.randomBytes(32).toString('hex')}`,
  );

  await prepareTempDirectory(baseDir, tempDir);

  await expect(
    // Disable worker threads as they can't run in a TypeScript context.
    lint(args, tscOutputStream, false),
  ).resolves.toBeUndefined();

  const tempDirRegex = new RegExp(tempDir, 'g');

  expect(stdout(tempDirRegex)).toMatchSnapshot();

  expect(
    buildkiteAnnotate.mock.calls.map(
      ([markdown, opts]) =>
        `\nOptions: ${inspect(opts)}\n\n${markdown.replace(
          tempDirRegex,
          '<random>',
        )}\n`,
    ),
  ).toMatchSnapshot();

  expect(process.exitCode).toBe(exitCode);
});
