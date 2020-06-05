import { getSkubaVersion } from '../../../utils/version';
import { createDependencyFilter, withPackage } from '../processing/package';
import { merge } from '../processing/record';
import { Module } from '../types';

const BUNDLED_DEPENDENCIES = [
  '@types/jest',
  'concurrently',
  'eslint',
  'eslint-config-seek',
  'jest',
  'prettier',
  'ts-jest',
  'ts-node',
  'ts-node-dev',
  'tsconfig-seek',
  'typescript',
] as const;

const filterDevDependencies = createDependencyFilter(
  BUNDLED_DEPENDENCIES,
  'devDependencies',
);

export const packageModule = async ({
  entryPoint,
}: {
  entryPoint: string;
}): Promise<Module> => {
  const version = await getSkubaVersion();

  const initialData = {
    devDependencies: {
      '@seek/skuba': version,
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
      entryPoint,
      template: null,
      version,
    },
  };

  const recurringData = {
    devDependencies: {
      '@seek/skuba': version,
    },
    skuba: {
      entryPoint,
      version,
    },
  };

  return {
    'package.json': withPackage((inputData) => {
      const outputData = merge(
        inputData,
        'skuba' in inputData ? recurringData : initialData,
      );

      return filterDevDependencies(outputData);
    }),
  };
};
