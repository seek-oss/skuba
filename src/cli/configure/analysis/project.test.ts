import { getSkubaVersion } from '../../../utils/version';
import * as packageAnalysis from '../analysis/package';
import { defaultOpts } from '../testing/module';

import * as project from './project';
import { diffFiles } from './project';

describe('diffFiles', () => {
  it('works from scratch', async () => {
    jest
      .spyOn(project, 'createDestinationFileReader')
      .mockReturnValue(() => Promise.resolve(undefined));
    jest.spyOn(packageAnalysis, 'getPackageVersion').mockResolvedValue('0.0.1');

    const [outputFiles, version] = await Promise.all([
      diffFiles(defaultOpts),
      getSkubaVersion(),
    ]);

    const manifest = outputFiles['package.json'];

    manifest.data = manifest.data?.replace(
      new RegExp(version, 'g'),
      '0.0.0-semantically-released',
    );

    expect(outputFiles).toMatchSnapshot();
  });
});
