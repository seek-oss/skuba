import { defaultOpts, executeModule } from '../testing/module';

import { nodemonModule } from './nodemon';

describe('nodemonModule', () => {
  it('works from scratch', async () => {
    const inputFiles = {};

    const outputFiles = await executeModule(
      nodemonModule,
      inputFiles,
      defaultOpts,
    );

    expect(outputFiles['nodemon.json']).toBeUndefined();
  });
});
