import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { ensureAssetPlaceholders, normaliseTemplate } from './index.js';

describe('normaliseTemplate', () => {
  it('replaces S3 key hashes with x characters of equal length', () => {
    expect(normaliseTemplate({ S3Key: 'abc123def456.zip' })).toEqual({
      S3Key: 'xxxxxxxxxxxx.zip',
    });
  });

  it('replaces CurrentVersion hashes with x characters of equal length regardless of construct id', () => {
    expect(normaliseTemplate({ Ref: 'workerCurrentVersionAbc123' })).toEqual({
      Ref: 'workerCurrentVersionxxxxxx',
    });
    expect(normaliseTemplate({ Ref: 'notifierCurrentVersionAbc123' })).toEqual({
      Ref: 'notifierCurrentVersionxxxxxx',
    });
    expect(normaliseTemplate({ Ref: 'CurrentVersionAbc123' })).toEqual({
      Ref: 'CurrentVersionxxxxxx',
    });
  });

  it('replaces pre-release semantic versions with x.x.x-xxxx', () => {
    expect(normaliseTemplate({ Value: '1.2.3-abc123' })).toEqual({
      Value: 'x.x.x-xxxxxx',
    });
  });

  it('replaces v-prefixed semantic versions with vx.x.x', () => {
    expect(normaliseTemplate({ Value: 'v1.2.3' })).toEqual({
      Value: 'vx.x.x',
    });
  });

  it('removes DD_TAGS containing git metadata', () => {
    expect(
      normaliseTemplate({
        DD_TAGS:
          'git.commit.sha:abc123def456,git.repository_url:github.com/org/repo',
        other: 'stable-value',
      }),
    ).toEqual({ other: 'stable-value' });
  });

  it('replaces Datadog layer version numbers with x', () => {
    expect(
      normaliseTemplate({ layer: 'layer:Datadog-Extension-ARM:42' }),
    ).toEqual({ layer: 'layer:Datadog-Extension-ARM:x' });
  });

  it('handles multiple replacements in the same object', () => {
    expect(
      normaliseTemplate({
        S3Key: 'abc123.zip',
        Value: 'v1.2.3',
        layer: 'layer:Datadog-Extension-ARM:42',
      }),
    ).toEqual({
      S3Key: 'xxxxxx.zip',
      Value: 'vx.x.x',
      layer: 'layer:Datadog-Extension-ARM:x',
    });
  });

  it('leaves objects with no volatile values unchanged', () => {
    const template = { Key: 'some-stable-value' };
    expect(normaliseTemplate(template)).toEqual(template);
  });

  it('returns a parsed object not a string', () => {
    expect(typeof normaliseTemplate({ Key: 'some-stable-value' })).toBe(
      'object',
    );
  });
});

describe('ensureAssetPlaceholders', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(path.join(os.tmpdir(), 'skuba-cdk-'));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('creates placeholder handlers for missing directories', () => {
    ensureAssetPlaceholders(['dist/worker', 'dist/other'], { cwd: tmpDir });

    for (const dir of ['dist/worker', 'dist/other']) {
      expect(
        readFileSync(path.join(tmpDir, dir, 'index.js'), 'utf8'),
      ).toContain('export const handler');
    }
  });

  it('leaves existing directories untouched', () => {
    const assetDir = path.join(tmpDir, 'dist/worker');
    mkdirSync(assetDir, { recursive: true });
    writeFileSync(path.join(assetDir, 'index.js'), 'real bundle');

    ensureAssetPlaceholders(['dist/worker'], { cwd: tmpDir });

    expect(readFileSync(path.join(assetDir, 'index.js'), 'utf8')).toBe(
      'real bundle',
    );
  });

  it('supports absolute paths', () => {
    const assetDir = path.join(tmpDir, 'abs');

    ensureAssetPlaceholders([assetDir]);

    expect(readFileSync(path.join(assetDir, 'index.js'), 'utf8')).toContain(
      'export const handler',
    );
  });
});
