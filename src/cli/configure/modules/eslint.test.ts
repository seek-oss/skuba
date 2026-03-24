import { describe, expect, it } from 'vitest';

import { defaultOpts, executeModule } from '../testing/module.js';

import { eslintModule } from './eslint.js';

describe('eslintModule', () => {
  it('works from scratch', async () => {
    const inputFiles = {};

    const outputFiles = await executeModule(
      eslintModule,
      inputFiles,
      defaultOpts,
    );

    expect(outputFiles['eslint.config.js']).toContain('skuba');
  });

  it('deletes rogue configs', async () => {
    const inputFiles = {
      '.eslintrc': 'this is deprecated!',
      'eslint.config.js': undefined,
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
    expect(outputFiles['eslint.config.js']).toContain('skuba');
    expect(outputFiles['.eslintrc.yml']).toBeUndefined();
    expect(outputFiles['package.json']).toContain('secret-service');
    expect(outputFiles['package.json']).not.toContain('eslintConfig');
  });

  it('overwrites divergent config', async () => {
    const inputFiles = {
      'eslint.config.js': "module.exports = { extends: ['skydive'] }",
    };

    const outputFiles = await executeModule(
      eslintModule,
      inputFiles,
      defaultOpts,
    );

    expect(outputFiles['eslint.config.js']).toContain('skuba');
    expect(outputFiles['eslint.config.js']).not.toContain('skydive');
  });

  it('preserves config extending old module import', async () => {
    const inputFiles = {
      'eslint.config.js':
        "module.exports = { extends: [require.resolve('@seek/skuba/config/eslint')], rules: { 'no-process-exit': 'off' } }",
    };

    const outputFiles = await executeModule(
      eslintModule,
      inputFiles,
      defaultOpts,
    );

    expect(outputFiles['eslint.config.js']).toMatchInlineSnapshot(`
      "module.exports = { extends: ['skuba'], rules: { 'no-process-exit': 'off' } };
      "
    `);
  });

  it('preserves config extending new module import', async () => {
    const inputFiles = {
      'eslint.config.js': `module.exports = { extends: [
          require.resolve("skuba/config/eslint")], rules: { "no-process-exit": "off" } }`,
    };

    const outputFiles = await executeModule(
      eslintModule,
      inputFiles,
      defaultOpts,
    );

    expect(outputFiles['eslint.config.js']).toMatchInlineSnapshot(`
      "module.exports = { extends: ['skuba'], rules: { 'no-process-exit': 'off' } };
      "
    `);
  });

  it('preserves config extending shareable config', async () => {
    const inputFiles = {
      'eslint.config.js':
        "module.exports = { extends: ['skuba'], rules: { 'no-process-exit': 'off' } };\n",
    };

    const outputFiles = await executeModule(
      eslintModule,
      inputFiles,
      defaultOpts,
    );

    expect(outputFiles['eslint.config.js']).toBe(
      inputFiles['eslint.config.js'],
    );
  });
});
