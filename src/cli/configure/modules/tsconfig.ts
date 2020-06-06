import { readBaseTemplateFile } from '../../../utils/template';
import { isObjectWithProp } from '../../../utils/validation';
import { formatObject, parseObject } from '../processing/json';
import { loadFiles } from '../processing/loadFiles';
import { merge } from '../processing/record';
import { Module } from '../types';

export const tsconfigModule = async (): Promise<Module> => {
  const [buildFile, baseFile] = await Promise.all([
    readBaseTemplateFile('tsconfig.build.json'),
    readBaseTemplateFile('tsconfig.json'),
  ]);

  const baseData = parseObject(baseFile);

  // existing project may target earlier Node.js versions than skuba
  if (
    isObjectWithProp(baseData, 'compilerOptions') &&
    isObjectWithProp(baseData.compilerOptions, 'target')
  ) {
    delete baseData.compilerOptions.target;
  }

  return {
    ...loadFiles('Dockerfile'),

    'tsconfig.build.json': (inputFile) => inputFile ?? buildFile,

    'tsconfig.json': (inputFile, files, initialFiles) => {
      const inputData = parseObject(inputFile);

      let outDir: string | undefined;

      if (
        isObjectWithProp(inputData, 'compilerOptions') &&
        isObjectWithProp(inputData.compilerOptions, 'outDir') &&
        typeof inputData.compilerOptions.outDir === 'string'
      ) {
        outDir = inputData.compilerOptions.outDir.replace(/\/$/, '');
      }

      // optimistically rewire Dockerfile for new output directory
      if (typeof outDir !== 'undefined' && outDir !== 'lib') {
        files.Dockerfile = files.Dockerfile?.split(outDir).join('lib');
      }

      const outputData = merge(inputData ?? {}, baseData);

      // for optimal ESLinting, base config should compile all files and leave
      // exclusions to .eslintignore and tsconfig.build.json
      if (
        !initialFiles['tsconfig.json']?.includes('skuba/config/tsconfig.json')
      ) {
        delete outputData.include;
      }

      return formatObject(outputData);
    },
  };
};
