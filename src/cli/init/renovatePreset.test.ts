import { describe, expect, it } from 'vitest';

import { createEjsRenderer } from '../../utils/copy.js';
import { readBaseTemplateFile } from '../../utils/template.js';

import { baseToTemplateData } from './getConfig.js';

describe('Renovate preset template', () => {
  it('includes the configured preset in template data', async () => {
    const renovatePreset = 'github>my-org/renovate-config';

    await expect(
      baseToTemplateData({
        ownerName: 'my-org/my-team',
        repoName: 'my-repo',
        platformName: 'arm64',
        defaultBranch: 'main',
        renovatePreset,
      }),
    ).resolves.toMatchObject({ renovatePreset });
  });

  it('renders the configured preset', async () => {
    const renovatePreset = 'github>my-org/renovate-config';
    const template = await readBaseTemplateFile('.github/renovate.json5');

    expect(createEjsRenderer({ renovatePreset })('renovate.json5', template))
      .toBe(`{
  extends: ['${renovatePreset}'],
}
`);
  });
});
