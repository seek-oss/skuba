import { readBaseTemplateFile } from '../../../utils/template';
import { hasProp, hasStringProp, isObject } from '../../../utils/validation';
import { formatObject, parseObject } from '../processing/json';
import { loadFiles } from '../processing/loadFiles';
import { merge } from '../processing/record';
import type { Module, Options } from '../types';

export const tsconfigModule = async ({
  firstRun,
  type,
}: Options): Promise<Module> => {
  const [buildFile, baseFile] = await Promise.all([
    readBaseTemplateFile('tsconfig.build.json'),
    readBaseTemplateFile('tsconfig.json'),
  ]);

  const baseData = parseObject(baseFile);

  // packages should not use module aliases
  if (
    type === 'package' &&
    hasProp(baseData, 'compilerOptions') &&
    isObject(baseData.compilerOptions)
  ) {
    delete baseData.compilerOptions.baseUrl;
    delete baseData.compilerOptions.paths;
  }

  return {
    ...loadFiles('Dockerfile'),

    'tsconfig.build.json': (inputFile) => inputFile ?? buildFile,

    'tsconfig.json': (inputFile, files, initialFiles) => {
      const inputData = parseObject(inputFile);

      let outDir: string | undefined;

      if (
        hasProp(inputData, 'compilerOptions') &&
        hasStringProp(inputData.compilerOptions, 'outDir')
      ) {
        outDir = inputData.compilerOptions.outDir.replace(/\/$/, '');
      }

      // optimistically rewire Dockerfile for new output directory
      if (outDir !== undefined && outDir !== 'lib') {
        files.Dockerfile = files.Dockerfile?.replace(
          new RegExp(`([^\\w])${outDir}([^\\w])`, 'g'),
          '$1lib$2',
        );
      }

      // existing project may target earlier Node.js versions than skuba
      if (hasProp(baseData, 'compilerOptions')) {
        if (
          hasProp(baseData.compilerOptions, 'lib') &&
          hasProp(inputData?.compilerOptions, 'lib')
        ) {
          delete baseData.compilerOptions.lib;
        }

        if (
          hasProp(baseData.compilerOptions, 'target') &&
          hasProp(inputData?.compilerOptions, 'target')
        ) {
          delete baseData.compilerOptions.target;
        }
      }

      const outputData = merge(inputData ?? {}, baseData);

      // Remove `lib/**/*` and `lib`, which duplicate `lib*/**/*`
      if (hasProp(outputData, 'exclude') && Array.isArray(outputData.exclude)) {
        const { exclude } = outputData;

        const hasLibStar = exclude.includes('lib*/**/*');

        outputData.exclude = exclude.filter(
          (pattern: unknown) =>
            !(hasLibStar && new Set<unknown>(['lib', 'lib/**/*']).has(pattern)),
        );
      }

      // for optimal ESLinting, base config should compile all files and leave
      // exclusions to .eslintignore and tsconfig.build.json
      if (
        hasProp(outputData, 'include') &&
        !initialFiles['tsconfig.json']?.includes('skuba/config/tsconfig.json')
      ) {
        delete outputData.include;
      }

      // Retain comments for package documentation
      if (
        firstRun &&
        type === 'package' &&
        hasProp(outputData, 'compilerOptions') &&
        isObject(outputData.compilerOptions) &&
        !outputData.compilerOptions.removeComments
      ) {
        outputData.compilerOptions.removeComments = false;
      }

      return formatObject(outputData);
    },
  };
};
