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

  // existing project may target earlier Node.js versions than skuba
  if (
    hasProp(baseData, 'compilerOptions') &&
    hasProp(baseData.compilerOptions, 'target')
  ) {
    delete baseData.compilerOptions.target;
  }

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

      const outputData = merge(inputData ?? {}, baseData);

      // Remove `lib/**/*` and `lib`, which duplicate `lib*/**/*`
      if (Array.isArray(outputData.exclude)) {
        const { exclude } = outputData;

        const hasLibStar = exclude.includes('lib*/**/*');

        outputData.exclude = exclude.filter(
          (pattern) => !(hasLibStar && ['lib', 'lib/**/*'].includes(pattern)),
        );
      }

      // for optimal ESLinting, base config should compile all files and leave
      // exclusions to .eslintignore and tsconfig.build.json
      if (
        !initialFiles['tsconfig.json']?.includes('skuba/config/tsconfig.json')
      ) {
        delete outputData.include;
      }

      // Retain comments for package documentation
      if (
        firstRun &&
        type === 'package' &&
        isObject(outputData.compilerOptions) &&
        !outputData.compilerOptions.removeComments
      ) {
        outputData.compilerOptions.removeComments = false;
      }

      return formatObject(outputData);
    },
  };
};
