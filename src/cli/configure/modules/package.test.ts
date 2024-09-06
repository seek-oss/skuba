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
      license: 'UNLICENSED',
      private: true,
      scripts: {
        build: 'skuba build',
        format: 'skuba format',
        lint: 'skuba lint',
        start: 'skuba start',
        test: 'skuba test --coverage',
        'test:watch': 'skuba test --watch',
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
      files: [
        'lib*/**/*.d.ts',
        'lib*/**/*.js',
        'lib*/**/*.js.map',
        'lib*/**/*.json',
      ],
      license: 'UNLICENSED',
      main: './lib-commonjs/index.js',
      module: './lib-esm/index.js',
      private: false,
      scripts: {
        build: 'skuba build-package',
        format: 'skuba format',
        lint: 'skuba lint',
        release: 'skuba release',
        test: 'skuba test --coverage',
        'test:watch': 'skuba test --watch',
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
    expect(outputData.devDependencies).toHaveProperty('pino-pretty', '0.0.1');
    expect(outputData.private).toBeUndefined();
    expect(outputData.scripts).toStrictEqual({});
    expect(outputData.skuba).toHaveProperty('entryPoint');
    expect(outputData.skuba).toHaveProperty('template', 'koa-rest-api');
    expect(outputData.skuba).toHaveProperty('version');
  });

  it('overhauls divergent config', async () => {
    const inputFiles = {
      '.npmignore': '**/*\n',
      'package.json': JSON.stringify({
        $name: 'secret-service',
        devDependencies: {
          'pino-pretty': '0.0.1',
        },
        license: 'MIT',
        scripts: {
          'test:jest': 'jest',
          'test:build': 'tsc --noEmit --incremental false',
        },
      }),
      'package-lock.json': '{}\n',
    };

    const outputFiles = await executeModule(
      packageModule,
      inputFiles,
      defaultOpts,
    );

    expect(outputFiles['.npmignore']).toBeUndefined();
    expect(outputFiles['package-lock.json']).toBeUndefined();

    const outputData = parsePackage(outputFiles['package.json']);

    assertDefined(outputData);
    expect(outputData.license).toBe('MIT');
    expect(outputData.private).toBe(true);
    expect(outputData.scripts).toHaveProperty('build');
    expect(outputData.scripts).toHaveProperty('test', 'skuba test --coverage');
    expect(outputData.scripts).not.toHaveProperty('test:build');
    expect(outputData.scripts).not.toHaveProperty('test:jest');
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
        module: 'lib/esm',
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
      },
      files: [
        'lib*/**/*.d.ts',
        'lib*/**/*.js',
        'lib*/**/*.js.map',
        'lib*/**/*.json',
        'something-else',
      ],
      license: 'UNLICENSED',
      main: './lib-commonjs/index.js',
      module: './lib-esm/index.js',
      private: false,
      scripts: {
        build: 'skuba build-package',
        format: 'skuba format',
        lint: 'skuba lint',
        release: 'yarn -s build && skuba release',
        start: 'my-custom-script',
        test: 'skuba test --coverage',
        'test:watch': 'skuba test --watch',
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

  it('privatises a workspaced manifest', async () => {
    const inputFiles = {
      'package.json': JSON.stringify({
        devDependencies: {},
        scripts: {},
        skuba: {},
        workspaces: {},
      }),
    };

    const outputFiles = await executeModule(
      packageModule,
      inputFiles,
      defaultOpts,
    );

    const outputData = parsePackage(outputFiles['package.json']);

    expect(outputData).toHaveProperty('private', true);
  });
});
