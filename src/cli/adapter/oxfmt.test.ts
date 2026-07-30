import os from 'os';
import path from 'path';
import { stripVTControlCharacters } from 'util';

import { mkdtemp, readFile, rm, writeFile } from 'fs-extra';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import oxfmtConfig from '../../../oxfmt.config.js';
import * as execUtils from '../../utils/exec.js';
import type { Logger } from '../../utils/logging.js';

import { type OxfmtResult, runOxfmt } from './oxfmt.js';

const originalCwd = process.cwd();

// Timings and thread counts vary between machines and runs - normalise them
// so the output captured below stays stable across environments.
const normalizeOutput = (text: string) =>
  stripVTControlCharacters(text)
    .replace(/\d+ms/g, '<ms>ms')
    .replace(/\d+ threads/g, '<n> threads');

let capturedOutput: string[] = [];

const output = () => normalizeOutput(capturedOutput.join('\n'));

beforeEach(() => {
  capturedOutput = [];
});

vi.spyOn(console, 'log').mockImplementation((...args: unknown[]) => {
  // Captures the per-line `log.plain` output emitted by the CI lint path.
  capturedOutput.push(args.join(' '));
});

// oxfmt runs as a real child process against fixture files on disk. The
// `exec` helper defaults to inherited stdio so its output streams straight
// to the terminal, which is noisy in a test run - pipe it instead, and
// capture the combined stdout/stderr so it can be asserted on rather than
// printed.
const pipedExec = execUtils.createExec({ stdio: 'pipe', all: true });

vi.spyOn(execUtils, 'exec').mockImplementation((...args) => {
  const run = pipedExec(...args);

  run.then(
    (result) => capturedOutput.push(result.all),
    (error) => capturedOutput.push(error?.all ?? ''),
  );

  return run;
});

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(path.join(os.tmpdir(), 'skuba-oxfmt-'));
  process.chdir(dir);

  // Give oxfmt our real config so fixtures are checked against the same
  // rules as the rest of the codebase. `oxfmt.config.ts` itself can't be
  // copied as-is - it imports `oxc-config-seek`, which won't resolve
  // outside this project's node_modules - so we write out its already
  // JSON-serializable value under the name oxfmt auto-discovers instead.
  await writeFile(
    path.join(dir, '.oxfmtrc.json'),
    `${JSON.stringify(oxfmtConfig, null, 2)}\n`,
  );
});

afterEach(async () => {
  process.chdir(originalCwd);
  await rm(dir, { recursive: true, force: true });
  vi.unstubAllEnvs();
});

const writeFixture = (name: string, contents: string) =>
  writeFile(path.join(dir, name), contents);

const readFixture = (name: string) => readFile(path.join(dir, name), 'utf-8');

const logger = {
  plain: vi.fn(),
  err: vi.fn(),
} as Partial<Logger> as Logger;

describe('runOxfmt', () => {
  describe('format mode', () => {
    it('formats files in place and returns ok: true', async () => {
      await writeFixture('a.ts', 'const   x=1;\n');

      await expect(runOxfmt('format', logger)).resolves.toEqual({ ok: true });

      await expect(readFixture('a.ts')).resolves.toBe('const x = 1;\n');

      expect(output()).toMatchInlineSnapshot(
        `"Finished in <ms>ms on 2 files using <n> threads."`,
      );
    });

    it('returns ok: false when a file cannot be parsed', async () => {
      await writeFixture('a.ts', 'const x = ;;;\n');

      await expect(runOxfmt('format', logger)).resolves.toEqual({ ok: false });

      expect(output()).toMatchInlineSnapshot(`
        "
          x Unexpected token
           ,-[a.ts:1:11]
         1 | const x = ;;;
           :           ^
           \`----
        Error occurred when checking code style in the above files."
      `);
    });
  });

  describe('lint mode outside of CI', () => {
    beforeEach(() => {
      vi.stubEnv('CI', '');
      vi.stubEnv('BUILDKITE', '');
      vi.stubEnv('GITHUB_ACTIONS', '');
    });

    it('returns ok: true when files are already formatted', async () => {
      await writeFixture('a.ts', 'const x = 1;\n');

      await expect(runOxfmt('lint', logger)).resolves.toEqual({ ok: true });

      expect(output()).toMatchInlineSnapshot(`
        "Checking formatting...

        All matched files use the correct format.
        Finished in <ms>ms on 2 files using <n> threads."
      `);
    });

    it('returns ok: false when files need formatting', async () => {
      await writeFixture('a.ts', 'const   x=1;\n');

      await expect(runOxfmt('lint', logger)).resolves.toEqual({ ok: false });

      // Lint mode should never rewrite files.
      await expect(readFixture('a.ts')).resolves.toBe('const   x=1;\n');

      expect(output()).toMatchInlineSnapshot(`
        "Checking formatting...

        a.ts (<ms>ms)

        Format issues found in above 1 files. Run without \`--check\` to fix.
        Finished in <ms>ms on 2 files using <n> threads."
      `);
    });
  });

  describe('lint mode in CI', () => {
    beforeEach(() => {
      vi.stubEnv('CI', 'true');
    });

    it('returns ok: true when files are already formatted', async () => {
      await writeFixture('a.ts', 'const x = 1;\n');

      await expect(runOxfmt('lint', logger)).resolves.toEqual({ ok: true });

      expect(output()).toMatchInlineSnapshot(`
        "Checking formatting...

        All matched files use the correct format.
        Finished in <ms>ms on 2 files using <n> threads."
      `);
    });

    it('returns ok: false with the offending filepaths when files need formatting', async () => {
      await writeFixture('a.ts', 'const   x=1;\n');

      await expect(runOxfmt('lint', logger)).resolves.toEqual({
        ok: false,
        errors: [
          {
            path: 'a.ts',
            message: 'Oxfmt found formatting issues in this file.',
          },
        ],
      } satisfies OxfmtResult);

      expect(output()).toMatchInlineSnapshot(`
        "Checking formatting...

        a.ts (<ms>ms)

        Format issues found in above 1 files. Run without \`--check\` to fix.
        Finished in <ms>ms on 2 files using <n> threads."
      `);
    });

    it('returns ok: false with only the offending filepath when one of several files needs formatting', async () => {
      await writeFixture('good.ts', 'const x = 1;\n');
      await writeFixture('bad.ts', 'const   x=1;\n');

      await expect(runOxfmt('lint', logger)).resolves.toEqual({
        ok: false,
        errors: [
          {
            path: 'bad.ts',
            message: 'Oxfmt found formatting issues in this file.',
          },
        ],
      } satisfies OxfmtResult);

      expect(output()).toMatchInlineSnapshot(`
        "Checking formatting...

        bad.ts (<ms>ms)

        Format issues found in above 1 files. Run without \`--check\` to fix.
        Finished in <ms>ms on 3 files using <n> threads."
      `);
    });

    it('returns ok: false with no filepaths when a file cannot be parsed', async () => {
      await writeFixture('a.ts', 'const x = ;;;\n');

      const result = await runOxfmt('lint', logger);

      expect(result).toEqual({
        ok: false,
        errors: [
          {
            path: 'a.ts',
            message: `Oxlint errored while checking this file.

  × Unexpected token
   ╭─[a.ts:1:11]
 1 │ const x = ;;;
   ·           ─
   ╰────
`,
            position: { line: 1, column: 11 },
          },
        ],
        execError: expect.any(String),
      } satisfies OxfmtResult);

      expect(output()).toMatchInlineSnapshot(`
        "Checking formatting...


          × Unexpected token
           ╭─[a.ts:1:11]
         1 │ const x = ;;;
           ·           ─
           ╰────
        Error occurred when checking code style in the above files."
      `);
    });

    it('excludes "No config found" lines from the collected filepaths', async () => {
      // Remove the config we normally seed the temp dir with so oxfmt falls
      // back to defaults and emits its "No config found" warning for real.
      await rm(path.join(dir, '.oxfmtrc.json'));

      await writeFixture('a.ts', 'const   x=1;\n');

      await expect(runOxfmt('lint', logger)).resolves.toEqual({
        ok: false,
        errors: [
          {
            path: 'a.ts',
            message: 'Oxfmt found formatting issues in this file.',
          },
        ],
      } satisfies OxfmtResult);

      expect(output()).toMatchInlineSnapshot(`
        "Checking formatting...

        a.ts (<ms>ms)

        Format issues found in above 1 files. Run without \`--check\` to fix.
        Finished in <ms>ms on 1 files using <n> threads.
        No config found, using defaults. Please add a config file or try \`oxfmt --init\` if needed."
      `);
    });
  });
});
