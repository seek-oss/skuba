import { describe, expect, it, vi } from 'vitest';

import * as dir from '../../../utils/dir.js';
import { getSkubaVersion } from '../../../utils/version.js';
import { defaultOpts } from '../testing/module.js';

import * as project from './project.js';
import { diffFiles } from './project.js';

describe('diffFiles', () => {
  it('works from scratch', async () => {
    vi.spyOn(project, 'createDestinationFileReader').mockReturnValue(() =>
      Promise.resolve(undefined),
    );

    vi.spyOn(dir, 'crawlDirectory').mockResolvedValue([]);

    const [outputFiles, version] = await Promise.all([
      diffFiles(defaultOpts),
      getSkubaVersion(),
    ]);

    const manifest = outputFiles['package.json'];

    if (manifest) {
      manifest.data = manifest.data?.replace(
        new RegExp(version, 'g'),
        '0.0.0-semantically-released',
      );
    }

    expect(outputFiles).toMatchSnapshot();
  });
});
