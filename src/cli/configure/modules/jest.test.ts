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

    expect(outputFiles['jest.config.ts']).toContain('skuba');
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

    expect(outputFiles['jest.config.ts']).toContain('skuba');
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

    expect(outputFiles['jest.config.js']).toBeUndefined();
    expect(outputFiles['jest.config.ts']).toContain('skuba');
    expect(outputFiles['jest.config.ts']).not.toContain('skydive');
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

    expect(outputFiles['jest.config.js']).toBeUndefined();
    expect(outputFiles['jest.config.ts']).toContain('skuba');
    expect(outputFiles['jest.config.ts']).toContain('coverageThreshold');
    expect(outputFiles['jest.config.ts']).toContain(
      "globalSetup: './globalSetup.js',",
    );
    expect(outputFiles['jest.config.ts']).not.toContain('collectCoverage');
    expect(outputFiles['jest.config.ts']).not.toContain('skydive');
    expect(outputFiles['jest.setup.ts']).toBe(inputFiles['jest.setup.ts']);
  });

  it('migrates a skubified JavaScript config', async () => {
    const inputFiles = {
      'jest.config.js': `const { Jest } = require('skuba')

      module.exports = Jest.mergePreset({
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

    expect(outputFiles['jest.config.js']).toBeUndefined();
    expect(outputFiles['jest.config.ts']).toMatchInlineSnapshot(`
      "import { Jest } from 'skuba';

      export default Jest.mergePreset({
        collectCoverage: true,
        coverageThreshold: {},
        globalSetup: './globalSetup.js',
      });
      "
    `);
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

    expect(outputFiles['jest.config.js']).toBeUndefined();
    expect(outputFiles['jest.config.ts']).toMatchInlineSnapshot(`
      "export default {
        ...require('skuba/config/jest'),
        globalSetup: '<rootDir>/jest.setup.int.ts',
      };
      "
    `);
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

    expect(outputFiles['jest.config.js']).toBeUndefined();
    expect(outputFiles['jest.config.ts']).toMatchInlineSnapshot(`
      "export default {
        globalSetup: '<rootDir>/jest.setup.int.ts',
        preset: 'skuba',
      };
      "
    `);
    expect(outputFiles['jest.setup.ts']).toBe(inputFiles['jest.setup.ts']);
  });

  it('skips setup file after first run', async () => {
    const inputFiles = {
      'jest.config.ts': "module.exports = require('skuba/config/jest')",
      'jest.setup.ts': undefined,
    };

    const outputFiles = await executeModule(
      jestModule,
      inputFiles,
      defaultOpts,
    );

    expect(outputFiles['jest.config.ts']).toMatchInlineSnapshot(
      `"module.exports = require('skuba/config/jest')"`,
    );
    expect(outputFiles['jest.setup.ts']).toBeUndefined();
  });

  it('migrates JavaScript setup file', async () => {
    const inputFiles = {
      'jest.config.ts': 'export default {}',
      'jest.setup.js': "process.env.FORCE_COLOR = '0';",
    };

    const outputFiles = await executeModule(
      jestModule,
      inputFiles,
      defaultOpts,
    );

    expect(outputFiles['jest.setup.js']).toBeUndefined();
    expect(outputFiles['jest.setup.ts']).toBe(inputFiles['jest.setup.js']);
  });

  it.each([
    {
      description: 'with comment',
      config: `
import { Jest } from 'skuba';

export default Jest.mergePreset({
  globals: {
    'ts-jest': {
      // seek-oss/skuba#626
      isolatedModules: true,
    },
  },
  // Rest of config
});
`,
    },
    {
      description: 'without comment',
      config: `
import { Jest } from 'skuba';

export default Jest.mergePreset({
  globals: {
    'ts-jest': {
      isolatedModules: true,
    },
  },
  // Rest of config
});
`,
    },
  ])(
    'strips outdated `isolatedModules` config snippets $description',
    async ({ config }) => {
      const inputFiles = {
        'jest.config.ts': config,
        'jest.setup.ts': undefined,
      };

      const outputFiles = await executeModule(
        jestModule,
        inputFiles,
        defaultOpts,
      );

      expect(outputFiles['jest.config.ts']).toMatchInlineSnapshot(`
        "
        import { Jest } from 'skuba';

        export default Jest.mergePreset({
          // Rest of config
        });
        "
      `);
      expect(outputFiles['jest.setup.ts']).toBeUndefined();
    },
  );
});
