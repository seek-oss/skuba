import { defaultOpts, executeModule } from '../testing/module.js';

import { ignoreModule } from './ignore.js';

describe('ignoreModule', () => {
  it('works from scratch', async () => {
    const inputFiles = {};

    const outputFiles = await executeModule(
      ignoreModule,
      inputFiles,
      defaultOpts,
    );

    expect(outputFiles['.dockerignore']).toBeDefined();
    expect(outputFiles['.gitignore']).toBeDefined();
  });

  it('preserves original lines', async () => {
    const inputFiles = {
      '.dockerignore': '.idea',
      '.gitignore': '.idea',
    };

    const outputFiles = await executeModule(
      ignoreModule,
      inputFiles,
      defaultOpts,
    );

    expect(outputFiles['.dockerignore']).toContain('.idea');
    expect(outputFiles['.gitignore']).toContain('.idea');
  });
});
