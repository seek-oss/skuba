import * as fs from 'node:fs';
import { createRequire } from 'node:module';
import * as os from 'node:os';
import * as path from 'node:path';

import * as cdk from 'aws-cdk-lib';
import { describe, expect, it } from 'vitest';

import { Bundling } from '../bundling.js';

import {
  BASE_BUNDLING_PROPS,
  BRIDGE_BUILT,
  BRIDGE_PATH,
  FIXTURES,
} from './test-utils.js';

describe.runIf(process.env.CI)('rolldown bridge build', () => {
  it('is built before integration tests run', () => {
    expect(
      BRIDGE_BUILT,
      `Expected the rolldown bridge at ${BRIDGE_PATH} to exist before integration tests run. The package build step may have been skipped.`,
    ).toBe(true);
  });
});

describe.skipIf(!BRIDGE_BUILT)('rolldown bundling', () => {
  it('bundles handler and exports a callable function', async () => {
    const outputDir = fs.mkdtempSync(
      path.join(os.tmpdir(), 'lambda-bundle-rolldown-'),
    );
    try {
      const bundling = new Bundling({
        ...BASE_BUNDLING_PROPS,
        bundlerConfig: path.join(FIXTURES, 'rolldown', 'config.mjs'),
        entry: path.join(FIXTURES, 'handler.ts'),
      });

      expect(
        bundling.local.tryBundle(outputDir, {
          image: cdk.DockerImage.fromRegistry('dummy'),
        }),
      ).toBe(true);

      const indexPath = path.join(outputDir, 'index.js');
      expect(fs.existsSync(indexPath), `index.js missing in ${outputDir}`).toBe(
        true,
      );

      const require = createRequire(import.meta.url);
      const mod = require(indexPath) as { handler?: unknown };
      expect(typeof mod.handler, 'handler should be a function').toBe(
        'function',
      );

      const event = { source: 'integration-test', bundler: 'rolldown' };
      const result = await (mod.handler as (e: unknown) => Promise<unknown>)(
        event,
      );
      expect(result).toEqual(event);
    } finally {
      fs.rmSync(outputDir, { recursive: true, force: true });
    }
  }, 60_000);

  it('throws when the config provides an empty output array', () => {
    const outputDir = fs.mkdtempSync(
      path.join(os.tmpdir(), 'lambda-bundle-empty-output-'),
    );
    try {
      const bundling = new Bundling({
        ...BASE_BUNDLING_PROPS,
        bundlerConfig: path.join(
          FIXTURES,
          'rolldown',
          'empty-output.config.mjs',
        ),
        entry: path.join(FIXTURES, 'handler.ts'),
      });

      expect(() =>
        bundling.local.tryBundle(outputDir, {
          image: cdk.DockerImage.fromRegistry('dummy'),
        }),
      ).toThrow(/must contain exactly one entry/);
    } finally {
      fs.rmSync(outputDir, { recursive: true, force: true });
    }
  }, 60_000);

  it.each([
    {
      name: 'output.preserveModules is set',
      config: 'preserve-modules.config.mjs',
      match: /preserveModules/,
    },
    {
      name: 'output.entryFileNames is set',
      config: 'entry-file-names.config.mjs',
      match: /entryFileNames/,
    },
    {
      name: 'input is set',
      config: 'input.config.mjs',
      match: /`input` is not supported/,
    },
  ])(
    'throws when $name',
    ({ config, match }) => {
      const outputDir = fs.mkdtempSync(
        path.join(os.tmpdir(), 'lambda-bundle-guard-'),
      );
      try {
        const bundling = new Bundling({
          ...BASE_BUNDLING_PROPS,
          bundlerConfig: path.join(FIXTURES, 'rolldown', config),
          entry: path.join(FIXTURES, 'handler.ts'),
        });

        expect(() =>
          bundling.local.tryBundle(outputDir, {
            image: cdk.DockerImage.fromRegistry('dummy'),
          }),
        ).toThrow(match);
      } finally {
        fs.rmSync(outputDir, { recursive: true, force: true });
      }
    },
    60_000,
  );

  it('allows dynamic-import chunks alongside the entry', () => {
    const outputDir = fs.mkdtempSync(
      path.join(os.tmpdir(), 'lambda-bundle-dynamic-'),
    );
    try {
      const bundling = new Bundling({
        ...BASE_BUNDLING_PROPS,
        bundlerConfig: path.join(FIXTURES, 'rolldown', 'esm.config.mjs'),
        entry: path.join(FIXTURES, 'dynamic-import', 'handler.ts'),
      });

      expect(
        bundling.local.tryBundle(outputDir, {
          image: cdk.DockerImage.fromRegistry('dummy'),
        }),
      ).toBe(true);

      expect(fs.existsSync(path.join(outputDir, 'index.mjs'))).toBe(true);

      const chunks = fs
        .readdirSync(outputDir)
        .filter((file) => /\.(js|mjs|cjs)$/.test(file) && file !== 'index.mjs');
      expect(chunks.length).toBeGreaterThan(0);

      const pkg = JSON.parse(
        fs.readFileSync(path.join(outputDir, 'package.json'), 'utf-8'),
      );
      expect(pkg.type).toBe('module');
    } finally {
      fs.rmSync(outputDir, { recursive: true, force: true });
    }
  }, 60_000);
});
