import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { pathToFileURL } from 'node:url';

import * as cdk from 'aws-cdk-lib';
import { describe, expect, it } from 'vitest';

import { Bundling } from '../bundling.js';

import { BASE_BUNDLING_PROPS, BRIDGE_BUILT, FIXTURES } from './test-utils.js';

describe.skipIf(!BRIDGE_BUILT)('rolldown ESM', () => {
  it('writes type:module to package.json and produces a callable ESM handler', async () => {
    const outputDir = fs.mkdtempSync(
      path.join(os.tmpdir(), 'lambda-esm-rolldown-'),
    );
    try {
      const bundling = new Bundling({
        ...BASE_BUNDLING_PROPS,
        bundlerConfig: path.join(FIXTURES, 'rolldown', 'esm.config.mjs'),
        entry: path.join(FIXTURES, 'handler.ts'),
      });

      expect(
        bundling.local.tryBundle(outputDir, {
          image: cdk.DockerImage.fromRegistry('dummy'),
        }),
      ).toBe(true);

      const indexPath = path.join(outputDir, 'index.mjs');
      expect(
        fs.existsSync(indexPath),
        `index.mjs missing in ${outputDir}`,
      ).toBe(true);

      const pkgJsonPath = path.join(outputDir, 'package.json');
      expect(
        fs.existsSync(pkgJsonPath),
        `package.json missing in ${outputDir}`,
      ).toBe(true);
      const outPkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf-8')) as {
        type?: string;
      };
      expect(outPkg.type, 'package.json must have type:module').toBe('module');

      const mod = (await import(pathToFileURL(indexPath).href)) as {
        handler?: unknown;
      };
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
});
