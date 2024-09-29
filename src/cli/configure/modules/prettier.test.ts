import { defaultOpts, executeModule } from '../testing/module';

import { prettierModule } from './prettier';

describe('prettierModule', () => {
  it('works from scratch', async () => {
    const inputFiles = {};

    const outputFiles = await executeModule(
      prettierModule,
      inputFiles,
      defaultOpts,
    );

    expect(outputFiles['.prettierrc.js']).toContain('skuba/config/prettier');
  });

  it('deletes rogue configs', async () => {
    const inputFiles = {
      '.prettierrc': 'this is deprecated!',
      'eslint.config.js': undefined,
      '.prettierrc.toml': undefined,
      'package.json': JSON.stringify({
        $name: 'secret-service',
        prettier: {
          extends: [],
        },
      }),
    };

    const outputFiles = await executeModule(
      prettierModule,
      inputFiles,
      defaultOpts,
    );

    expect(outputFiles['.prettierrc']).toBeUndefined();
    expect(outputFiles['.prettierrc.js']).toContain('skuba/config/prettier');
    expect(outputFiles['.prettierrc.toml']).toBeUndefined();
    expect(outputFiles['package.json']).toContain('secret-service');
    expect(outputFiles['package.json']).not.toContain('prettier');
  });

  it('overwrites config', async () => {
    const inputFiles = {
      '.prettierrc.js':
        "module.exports = { ...require('skuba/configure/prettier'), singleQuote: false }",
    };

    const outputFiles = await executeModule(
      prettierModule,
      inputFiles,
      defaultOpts,
    );

    expect(outputFiles['.prettierrc.js']).toContain('skuba/config/prettier');
    expect(outputFiles['.prettierrc.js']).not.toContain('singleQuote');
  });
});
