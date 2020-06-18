import { defaultOpts, executeModule } from '../testing/module';

import { tslintModule } from './tslint';

describe('tslintModule', () => {
  it('works from scratch', async () => {
    const inputFiles = {};

    const outputFiles = await executeModule(
      tslintModule,
      inputFiles,
      defaultOpts,
    );

    expect(outputFiles['tslint.json']).toBeUndefined();
    expect(outputFiles['tslint.yaml']).toBeUndefined();
  });
});
