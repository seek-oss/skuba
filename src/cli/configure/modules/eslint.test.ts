import { defaultOpts, executeModule } from '../testing/module';

import { eslintModule } from './eslint';

describe('eslintModule', () => {
  it('works from scratch', async () => {
    const inputFiles = {};

    const outputFiles = await executeModule(
      eslintModule,
      inputFiles,
      defaultOpts,
    );

    expect(outputFiles['.eslintrc.js']).toContain('skuba/config/eslint');
  });

  it('deletes rogue configs', async () => {
    const inputFiles = {
      '.eslintrc': 'this is deprecated!',
      '.eslintrc.js': undefined,
      '.eslintrc.yml': undefined,
      'package.json': JSON.stringify({
        $name: 'secret-service',
        eslintConfig: {
          extends: [],
        },
      }),
    };

    const outputFiles = await executeModule(
      eslintModule,
      inputFiles,
      defaultOpts,
    );

    expect(outputFiles['.eslintrc']).toBeUndefined();
    expect(outputFiles['.eslintrc.js']).toContain('skuba/config/eslint');
    expect(outputFiles['.eslintrc.yml']).toBeUndefined();
    expect(outputFiles['package.json']).toContain('secret-service');
    expect(outputFiles['package.json']).not.toContain('eslintConfig');
  });

  it('overwrites divergent config', async () => {
    const inputFiles = {
      '.eslintrc.js': "module.exports = { extends: ['skydive'] }",
    };

    const outputFiles = await executeModule(
      eslintModule,
      inputFiles,
      defaultOpts,
    );

    expect(outputFiles['.eslintrc.js']).toContain('skuba/config/eslint');
    expect(outputFiles['.eslintrc.js']).not.toContain('skydive');
  });

  it('preserves extended config', async () => {
    const inputFiles = {
      '.eslintrc.js':
        "module.exports = { extends: ['skuba/config/eslint'], rules: [] }",
    };

    const outputFiles = await executeModule(
      eslintModule,
      inputFiles,
      defaultOpts,
    );

    expect(outputFiles['.eslintrc.js']).toBe(inputFiles['.eslintrc.js']);
  });
});
