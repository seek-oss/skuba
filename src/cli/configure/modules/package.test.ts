import { Assert } from '../../..';
import { parsePackage } from '../processing/package';
import { defaultOpts, executeModule } from '../testing/module';

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

    Assert.notNullish(outputData);
    expect(outputData.devDependencies).toHaveProperty('skuba');
    expect(outputData.license).toBe('UNLICENSED');
    expect(outputData.private).toBe(true);
    expect(outputData.scripts).toHaveProperty('build');
    expect(outputData.skuba).toHaveProperty('entryPoint');
    expect(outputData.skuba).toHaveProperty('template', null);
    expect(outputData.skuba).toHaveProperty('version');
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

    Assert.notNullish(outputData);
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

    Assert.notNullish(outputData);
    expect(outputData.license).toBe('UNLICENSED');
    expect(outputData.private).toBe(true);
    expect(outputData.scripts).toHaveProperty('build');
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

    Assert.notNullish(outputData);
    expect(outputData.devDependencies).toHaveProperty('skuba');
    expect(outputData.devDependencies).not.toHaveProperty('eslint');
    expect(outputData.devDependencies).toHaveProperty('pino-pretty', '0.0.1');
    expect(outputData.devDependencies).not.toHaveProperty('typescript');
  });
});
