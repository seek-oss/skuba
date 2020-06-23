import { defaultOpts, executeModule } from '../testing/module';

import { jestModule } from './jest';

describe('jestModule', () => {
  it('works from scratch', async () => {
    const inputFiles = {};

    const outputFiles = await executeModule(
      jestModule,
      inputFiles,
      defaultOpts,
    );

    expect(outputFiles['jest.config.js']).toContain('skuba');
    expect(outputFiles['jest.setup.ts']).toBeDefined();
  });

  it('removes rogue config', async () => {
    const inputFiles = {
      'package.json': JSON.stringify({
        $name: 'secret-service',
        jest: {},
      }),
    };

    const outputFiles = await executeModule(
      jestModule,
      inputFiles,
      defaultOpts,
    );

    expect(outputFiles['jest.config.js']).toContain('skuba');
    expect(outputFiles['jest.setup.ts']).toBeDefined();
    expect(outputFiles['package.json']).toContain('secret-service');
    expect(outputFiles['package.json']).not.toContain('jest');
  });

  it('overwrites divergent config', async () => {
    const inputFiles = {
      'jest.config.js': "module.exports = require('skydive')",
      'jest.setup.ts': "process.env.ENVIRONMENT = 'myMachine'",
    };

    const outputFiles = await executeModule(
      jestModule,
      inputFiles,
      defaultOpts,
    );

    expect(outputFiles['jest.config.js']).toContain('skuba');
    expect(outputFiles['jest.config.js']).not.toContain('skydive');
    expect(outputFiles['jest.setup.ts']).toBe(inputFiles['jest.setup.ts']);
  });

  it('migrates Jest options', async () => {
    const inputFiles = {
      'jest.config.js': `module.exports = {
        collectCoverage: true,
        coverageThreshold: {},
        globalSetup: "./globalSetup.js",
      };`,
      'jest.setup.ts': "process.env.ENVIRONMENT = 'myMachine'",
    };

    const outputFiles = await executeModule(
      jestModule,
      inputFiles,
      defaultOpts,
    );

    expect(outputFiles['jest.config.js']).toContain('skuba');
    expect(outputFiles['jest.config.js']).toContain('coverageThreshold');
    expect(outputFiles['jest.config.js']).toContain(
      "globalSetup: './globalSetup.js',",
    );
    expect(outputFiles['jest.config.js']).not.toContain('collectCoverage');
    expect(outputFiles['jest.config.js']).not.toContain('skydive');
    expect(outputFiles['jest.setup.ts']).toBe(inputFiles['jest.setup.ts']);
  });

  it('preserves config extending module import', async () => {
    const inputFiles = {
      'jest.config.js':
        "module.exports = { ...require('skuba/config/jest'), globalSetup: '<rootDir>/jest.setup.int.ts' }",
      'jest.setup.ts': "process.env.ENVIRONMENT = 'myMachine'",
    };

    const outputFiles = await executeModule(
      jestModule,
      inputFiles,
      defaultOpts,
    );

    expect(outputFiles['jest.config.js']).toBe(inputFiles['jest.config.js']);
    expect(outputFiles['jest.setup.ts']).toBe(inputFiles['jest.setup.ts']);
  });

  it('preserves config extending preset', async () => {
    const inputFiles = {
      'jest.config.js':
        "module.exports = { globalSetup: '<rootDir>/jest.setup.int.ts', preset: 'skuba' }",
      'jest.setup.ts': "process.env.ENVIRONMENT = 'myMachine'",
    };

    const outputFiles = await executeModule(
      jestModule,
      inputFiles,
      defaultOpts,
    );

    expect(outputFiles['jest.config.js']).toBe(inputFiles['jest.config.js']);
    expect(outputFiles['jest.setup.ts']).toBe(inputFiles['jest.setup.ts']);
  });

  it('skips setup file after first run', async () => {
    const inputFiles = {
      'jest.config.js': "module.exports = require('skuba/config/jest')",
      'jest.setup.ts': undefined,
    };

    const outputFiles = await executeModule(
      jestModule,
      inputFiles,
      defaultOpts,
    );

    expect(outputFiles['jest.config.js']).toBe(inputFiles['jest.config.js']);
    expect(outputFiles['jest.setup.ts']).toBeUndefined();
  });
});
