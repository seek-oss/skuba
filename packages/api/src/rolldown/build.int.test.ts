import * as os from 'node:os';
import * as path from 'node:path';

import fs from 'fs-extra';
import { defineConfig } from 'rolldown';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { build } from './build.js';
import { lambdaAsset } from './lambdaAsset.js';

describe('build', () => {
  let workingDir: string;

  const listFiles = async (dir: string) =>
    (await fs.promises.readdir(path.join(workingDir, dir))).sort();

  const readFile = (file: string) =>
    fs.promises.readFile(path.join(workingDir, file), 'utf-8');

  beforeEach(async () => {
    vi.stubEnv('ENVIRONMENT', undefined);

    workingDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'rolldown-build-int-'),
    );

    await fs.promises.mkdir(path.join(workingDir, 'src'));
    await Promise.all(
      ['a', 'b'].map((name) =>
        fs.promises.writeFile(
          path.join(workingDir, 'src', `${name}.ts`),
          `export const handler = () => 'from-${name}';\n`,
        ),
      ),
    );
  });

  afterEach(async () => {
    vi.unstubAllEnvs();
    await fs.remove(workingDir);
  });

  const worker = (name: string) =>
    defineConfig({
      input: { index: path.join(workingDir, 'src', `${name}.ts`) },
      output: { dir: path.join(workingDir, 'dist', name) },
      plugins: [lambdaAsset()],
      logLevel: 'silent',
    });

  it('builds a single config', async () => {
    await build(worker('a'));

    await expect(listFiles('dist/a')).resolves.toEqual([
      'index.js',
      'package.json',
    ]);
    await expect(readFile('dist/a/index.js')).resolves.toContain('from-a');
  });

  it('builds an array of configs', async () => {
    await build([worker('a'), worker('b')]);

    await expect(readFile('dist/a/index.js')).resolves.toContain('from-a');
    await expect(readFile('dist/b/index.js')).resolves.toContain('from-b');
  });

  it('writes a config to each of its outputs', async () => {
    await build(
      defineConfig({
        input: { index: path.join(workingDir, 'src', 'a.ts') },
        output: [
          { dir: path.join(workingDir, 'dist', 'one') },
          { dir: path.join(workingDir, 'dist', 'two') },
        ],
        plugins: [lambdaAsset()],
        logLevel: 'silent',
      }),
    );

    for (const dir of ['dist/one', 'dist/two']) {
      await expect(listFiles(dir)).resolves.toEqual([
        'index.js',
        'package.json',
      ]);
      await expect(readFile(`${dir}/index.js`)).resolves.toContain('from-a');
    }
  });

  it('stubs every output of a config sharing one plugin when ENVIRONMENT=test', async () => {
    vi.stubEnv('ENVIRONMENT', 'test');

    await build(
      defineConfig({
        input: { index: path.join(workingDir, 'src', 'a.ts') },
        output: [
          { dir: path.join(workingDir, 'dist', 'one') },
          { dir: path.join(workingDir, 'dist', 'two') },
        ],
        plugins: [lambdaAsset()],
        logLevel: 'silent',
      }),
    );

    for (const dir of ['dist/one', 'dist/two']) {
      const stub = await readFile(`${dir}/index.js`);
      expect(stub).toContain('handler');
      expect(stub).not.toContain('from-a');
    }
  });

  it('resolves relative paths against cwd', async () => {
    await build(
      defineConfig({
        input: { index: 'src/a.ts' },
        output: { dir: 'dist/a' },
        plugins: [lambdaAsset()],
        logLevel: 'silent',
      }),
      { cwd: workingDir },
    );

    await expect(listFiles('dist/a')).resolves.toEqual([
      'index.js',
      'package.json',
    ]);
  });
});
