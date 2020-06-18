import { parsePackage } from '../processing/package';
import {
  assertDefined,
  defaultOpts,
  defaultPackageOpts,
  executeModule,
} from '../testing/module';

import { packageModule } from './package';

describe('packageModule', () => {
  it('works from scratch', async () => {
    const inputFiles = {};

    const outputFiles = await executeModule(
      packageModule,
      inputFiles,
      defaultOpts,
    );

    const outputData = parsePackage(outputFiles['package.json']);

    expect(outputData).toMatchObject({
      devDependencies: {
        skuba: expect.any(String),
      },
      license: 'UNLICENSED',
      private: true,
      scripts: {
        build: 'skuba build',
        format: 'skuba format',
        lint: 'skuba lint',
        start: 'ENVIRONMENT=local skuba start',
        test: 'skuba test',
      },
      skuba: {
        entryPoint: 'src/app.ts',
        template: null,
        type: 'application',
        version: expect.any(String),
      },
    });
  });

  it('works from scratch for packages', async () => {
    const inputFiles = {};

    const outputFiles = await executeModule(
      packageModule,
      inputFiles,
      defaultPackageOpts,
    );

    const outputData = parsePackage(outputFiles['package.json']);

    expect(outputData).toMatchObject({
      devDependencies: {
        skuba: expect.any(String),
      },
      files: ['lib*/**/*.d.ts', 'lib*/**/*.js', 'lib*/**/*.js.map'],
      license: 'UNLICENSED',
      main: './lib-commonjs/index.js',
      module: './lib-es2015/index.js',
      private: false,
      scripts: {
        build: 'skuba build-package',
        format: 'skuba format',
        lint: 'skuba lint',
        release: 'skuba release',
        test: 'skuba test',
      },
      skuba: {
        entryPoint: 'src/index.ts',
        template: null,
        type: 'package',
        version: expect.any(String),
      },
      types: './lib-types/index.d.ts',
      version: '0.0.0-semantically-released',
    });
  });

  it('patches extended config', async () => {
    const inputFiles = {
      'package.json': JSON.stringify({
        $name: 'secret-service',
        devDependencies: {
          'pino-pretty': '0.0.1',
        },
        scripts: {},
        skuba: {
          template: 'koa-rest-api',
        },
      }),
    };

    const outputFiles = await executeModule(
      packageModule,
      inputFiles,
      defaultOpts,
    );

    const outputData = parsePackage(outputFiles['package.json']);

    assertDefined(outputData);
    expect(outputData.$name).toBe('secret-service');
    expect(outputData.devDependencies).toHaveProperty('skuba');
    expect(outputData.devDependencies).toHaveProperty('pino-pretty', '0.0.1');
    expect(outputData.private).toBeUndefined();
    expect(outputData.scripts).toStrictEqual({});
    expect(outputData.skuba).toHaveProperty('entryPoint');
    expect(outputData.skuba).toHaveProperty('template', 'koa-rest-api');
    expect(outputData.skuba).toHaveProperty('version');
  });

  it('overhauls divergent config', async () => {
    const inputFiles = {
      'package.json': JSON.stringify({
        $name: 'secret-service',
        devDependencies: {
          'pino-pretty': '0.0.1',
        },
        license: 'MIT',
        scripts: {},
      }),
    };

    const outputFiles = await executeModule(
      packageModule,
      inputFiles,
      defaultOpts,
    );

    const outputData = parsePackage(outputFiles['package.json']);

    assertDefined(outputData);
    expect(outputData.license).toBe('MIT');
    expect(outputData.private).toBe(true);
    expect(outputData.scripts).toHaveProperty('build');
  });

  it('overhauls seek-module-toolkit configuration', async () => {
    const inputFiles = {
      'package.json': JSON.stringify({
        devDependencies: {
          'pino-pretty': '0.0.1',
        },
        files: ['lib', 'something-else'],
        license: 'UNLICENSED',
        main: 'lib/commonjs',
        module: 'lib/es2015',
        scripts: {
          build: 'smt build',
          commit: 'smt commit',
          format: 'smt format',
          'format:check': 'smt format check',
          lint: 'smt lint',
          prerelease: 'smt build',
          release: 'smt release',
          start: 'my-custom-script',
          test: 'jest --coverage',
        },
        typings: 'lib/index.d.ts',
        version: '0.0.0-semantically-released',
      }),
    };

    const outputFiles = await executeModule(
      packageModule,
      inputFiles,
      defaultPackageOpts,
    );

    const outputData = parsePackage(outputFiles['package.json']);

    expect(outputData).toMatchObject({
      devDependencies: {
        'pino-pretty': '0.0.1',
        skuba: expect.any(String),
      },
      files: [
        'lib*/**/*.d.ts',
        'lib*/**/*.js',
        'lib*/**/*.js.map',
        'something-else',
      ],
      license: 'UNLICENSED',
      main: './lib-commonjs/index.js',
      module: './lib-es2015/index.js',
      private: false,
      scripts: {
        build: 'skuba build-package',
        format: 'skuba format',
        lint: 'skuba lint',
        release: 'yarn build && skuba release',
        start: 'my-custom-script',
        test: 'skuba test',
      },
      skuba: {
        entryPoint: 'src/index.ts',
        template: null,
        type: 'package',
        version: expect.any(String),
      },
      types: './lib-types/index.d.ts',
      version: '0.0.0-semantically-released',
    });
  });

  it('drops bundled dev dependencies', async () => {
    const inputFiles = {
      'package.json': JSON.stringify({
        devDependencies: {
          eslint: '0.0.1',
          'pino-pretty': '0.0.1',
          typescript: '0.0.1',
        },
      }),
    };

    const outputFiles = await executeModule(
      packageModule,
      inputFiles,
      defaultOpts,
    );

    const outputData = parsePackage(outputFiles['package.json']);

    assertDefined(outputData);
    expect(outputData.devDependencies).toHaveProperty('skuba');
    expect(outputData.devDependencies).not.toHaveProperty('eslint');
    expect(outputData.devDependencies).toHaveProperty('pino-pretty', '0.0.1');
    expect(outputData.devDependencies).not.toHaveProperty('typescript');
  });
});
