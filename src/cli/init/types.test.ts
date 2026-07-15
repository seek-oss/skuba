import { describe, expect, it } from 'vitest';

import { DEFAULT_RENOVATE_PRESET, initConfigInputSchema } from './types.js';

const config = {
  destinationDir: 'my-repo',
  templateComplete: true,
  templateData: {
    ownerName: 'my-org/my-team',
    repoName: 'my-repo',
    platformName: 'arm64',
    defaultBranch: 'main',
  },
  templateName: 'greeter',
} as const;

describe('initConfigInputSchema', () => {
  it('defaults the Renovate preset to Rynovate', () => {
    expect(initConfigInputSchema.parse(config).templateData).toMatchObject({
      renovatePreset: DEFAULT_RENOVATE_PRESET,
    });
  });

  it('accepts a custom Renovate preset', () => {
    const renovatePreset = 'github>my-org/renovate-config';

    expect(
      initConfigInputSchema.parse({
        ...config,
        templateData: { ...config.templateData, renovatePreset },
      }).templateData,
    ).toMatchObject({ renovatePreset });
  });
});
