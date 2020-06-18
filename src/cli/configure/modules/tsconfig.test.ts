import { parseObject } from '../processing/json';
import {
  assertDefined,
  defaultOpts,
  defaultPackageOpts,
  executeModule,
} from '../testing/module';
import { TsConfigJson } from '../types';

import { tsconfigModule } from './tsconfig';

describe('tsconfigModule', () => {
  it('works from scratch', async () => {
    const inputFiles = {};

    const outputFiles = await executeModule(
      tsconfigModule,
      inputFiles,
      defaultOpts,
    );

    expect(outputFiles['tsconfig.build.json']).toContain('./tsconfig.json');
    expect(outputFiles['tsconfig.json']).toContain(
      'skuba/config/tsconfig.json',
    );

    const outputData = parseObject(
      outputFiles['tsconfig.json'],
    ) as TsConfigJson;

    assertDefined(outputData);
    expect(outputData.compilerOptions!.baseUrl).toBe('.');
    expect(outputData.compilerOptions!.paths).toEqual({ src: ['src'] });
  });

  it('disables module aliasing for packages', async () => {
    const inputFiles = {};

    const outputFiles = await executeModule(
      tsconfigModule,
      inputFiles,
      defaultPackageOpts,
    );

    expect(outputFiles['tsconfig.build.json']).toContain('./tsconfig.json');
    expect(outputFiles['tsconfig.json']).toContain(
      'skuba/config/tsconfig.json',
    );

    const outputData = parseObject(
      outputFiles['tsconfig.json'],
    ) as TsConfigJson;

    assertDefined(outputData);
    expect(outputData.compilerOptions!.baseUrl).toBeUndefined();
    expect(outputData.compilerOptions!.paths).toBeUndefined();
  });

  it('augments existing config', async () => {
    const inputFiles = {
      'tsconfig.build.json': '{}',
      'tsconfig.json':
        '{"compilerOptions": {"target": "ES2020"}, "exclude": [".idea"], "include": ["src"]}',
      '.eslintrc.js': undefined,
      '.prettierrc.toml': undefined,
      'package.json': JSON.stringify({
        name: 'secret-service',
        prettier: {
          extends: [],
        },
      }),
    };

    const outputFiles = await executeModule(
      tsconfigModule,
      inputFiles,
      defaultOpts,
    );

    expect(outputFiles['tsconfig.build.json']).toBe(
      inputFiles['tsconfig.build.json'],
    );

    const outputData = parseObject(
      outputFiles['tsconfig.json'],
    ) as TsConfigJson;

    assertDefined(outputData);
    expect(outputData.compilerOptions!.outDir).toBe('lib');
    expect(outputData.compilerOptions!.target).toBe('ES2020');
    expect(outputData.exclude).toContain('lib/**/*');
    expect(outputData.exclude).toContain('.idea');
    expect(outputData.extends).toBe('skuba/config/tsconfig.json');
    expect(outputData.include).toBeUndefined();
  });

  it('migrates divergent outDir', async () => {
    const inputFiles = {
      Dockerfile: 'COPY --from=build /workdir/dist ./dist',
      'tsconfig.json': '{"compilerOptions": {"outDir": "dist/"}}',
    };

    const outputFiles = await executeModule(
      tsconfigModule,
      inputFiles,
      defaultOpts,
    );

    expect(outputFiles.Dockerfile).toBe('COPY --from=build /workdir/lib ./lib');

    const outputData = parseObject(
      outputFiles['tsconfig.json'],
    ) as TsConfigJson;

    assertDefined(outputData);
    expect(outputData.compilerOptions!.outDir).toBe('lib');
  });

  it('retains include option after initial setup', async () => {
    const inputFiles = {
      'tsconfig.json':
        '{"extends": "skuba/config/tsconfig.json", "include": ["src"]}',
    };

    const outputFiles = await executeModule(
      tsconfigModule,
      inputFiles,
      defaultOpts,
    );

    const outputData = parseObject(
      outputFiles['tsconfig.json'],
    ) as TsConfigJson;

    assertDefined(outputData);
    expect(outputData.extends).toBe('skuba/config/tsconfig.json');
    expect(outputData.include).toStrictEqual(['src']);
  });
});
