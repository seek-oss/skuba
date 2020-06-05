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

  it('deletes configs', async () => {
    const inputFiles = {
      'package.json': JSON.stringify({
        devDependencies: {
          'something-else': '0.0.1',
          tslint: '0.0.1',
          'tslint-config-seek': '0.0.1',
        },
      }),
      'tslint.json': '{}',
      'tslint.yaml': '{}',
    };

    const outputFiles = await executeModule(
      tslintModule,
      inputFiles,
      defaultOpts,
    );

    expect(outputFiles['package.json']).toContain('something-else');
    expect(outputFiles['package.json']).not.toContain('tslint');
    expect(outputFiles['package.json']).not.toContain('tslint-config-seek');
    expect(outputFiles['tslint.json']).toBeUndefined();
    expect(outputFiles['tslint.yaml']).toBeUndefined();
  });
});
