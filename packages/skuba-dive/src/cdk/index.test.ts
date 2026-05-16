import { describe, expect, it } from 'vitest';

import { normaliseTemplate, normaliseTemplateJson } from './index.js';

describe('normaliseTemplateJson', () => {
  it('replaces S3 key hashes with x characters of equal length', () => {
    expect(normaliseTemplateJson(`{"S3Key":"abc123def456.zip"}`)).toBe(
      `{"S3Key":"xxxxxxxxxxxx.zip"}`,
    );
  });

  it('replaces workerCurrentVersion hashes with x characters of equal length', () => {
    expect(normaliseTemplateJson(`workerCurrentVersionAbc123"`)).toBe(
      `workerCurrentVersionxxxxxx"`,
    );
  });

  it('replaces pre-release semantic versions with x.x.x-xxxx', () => {
    expect(normaliseTemplateJson(`{"Value":"1.2.3-abc123"}`)).toBe(
      `{"Value": "x.x.x-xxxxxx"}`,
    );
  });

  it('replaces v-prefixed semantic versions with vx.x.x', () => {
    expect(normaliseTemplateJson(`{"Value":"v1.2.3"}`)).toBe(
      `{"Value": "vx.x.x"}`,
    );
  });

  it('removes DD_TAGS containing git metadata', () => {
    expect(
      normaliseTemplateJson(
        `{"DD_TAGS":"git.commit.sha:abc123def456,git.repository_url:github.com/org/repo",}`,
      ),
    ).toBe(`{}`);
  });

  it('replaces Datadog layer version numbers with x', () => {
    expect(normaliseTemplateJson(`layer:Datadog-Extension-ARM:42`)).toBe(
      `layer:Datadog-Extension-ARM:x`,
    );
  });

  it('handles multiple replacements in the same string', () => {
    expect(
      normaliseTemplateJson(
        `{"S3Key":"abc123.zip","Value":"v1.2.3","layer":"layer:Datadog-Extension-ARM:42"}`,
      ),
    ).toBe(
      `{"S3Key":"xxxxxx.zip","Value": "vx.x.x","layer":"layer:Datadog-Extension-ARM:x"}`,
    );
  });

  it('leaves strings with no volatile values unchanged', () => {
    const input = `{"Key":"some-stable-value"}`;
    expect(normaliseTemplateJson(input)).toBe(input);
  });
});

describe('normaliseTemplate', () => {
  it('returns a parsed object', () => {
    const template = { toJSON: () => ({ Key: 'some-stable-value' }) };

    expect(normaliseTemplate(template)).toEqual({ Key: 'some-stable-value' });
  });

  it('normalises volatile values in the template', () => {
    const template = { toJSON: () => ({ S3Key: 'abc123.zip' }) };

    expect(normaliseTemplate(template)).toEqual({ S3Key: 'xxxxxx.zip' });
  });
});
