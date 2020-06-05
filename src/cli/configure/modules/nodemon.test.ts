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

  it('deletes configs', async () => {
    const inputFiles = {
      'package.json': JSON.stringify({
        devDependencies: {
          nodemon: '0.0.1',
          'something-else': '0.0.1',
        },
      }),
      'nodemon.json': '{}',
    };

    const outputFiles = await executeModule(
      nodemonModule,
      inputFiles,
      defaultOpts,
    );

    expect(outputFiles['package.json']).not.toContain('nodemon');
    expect(outputFiles['package.json']).toContain('something-else');
    expect(outputFiles['nodemon.json']).toBeUndefined();
  });
});
