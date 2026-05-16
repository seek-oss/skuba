import { describe, expect, it } from 'vitest';

import { normaliseTemplate } from './index.js';

describe('normaliseTemplate', () => {
  it('replaces S3 key hashes with x characters of equal length', () => {
    expect(normaliseTemplate({ S3Key: 'abc123def456.zip' })).toEqual({
      S3Key: 'xxxxxxxxxxxx.zip',
    });
  });

  it('replaces workerCurrentVersion hashes with x characters of equal length', () => {
    expect(normaliseTemplate({ Ref: 'workerCurrentVersionAbc123' })).toEqual({
      Ref: 'workerCurrentVersionxxxxxx',
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
