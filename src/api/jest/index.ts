import type { Config } from '@jest/types';

import jestPreset from '../../../jest-preset.js';
import { mergeRaw } from '../../cli/configure/processing/record.js';

// Avoid TS4082 in Jest configuration files:
// Default export of the module has or is using private name `ConfigGlobals`.
export type { Config } from '@jest/types';

/**
 * Set of Jest options that are recommended and supported for customisation.
 *
 * While we technically accept anything compatible with `Config.InitialOptions`,
 * these are tacitly endorsed for our use cases and receive IntelliSense.
 */
type DefaultOptions =
  | 'collectCoverage'
  | 'collectCoverageFrom'
  | 'coveragePathIgnorePatterns'
  | 'coverageThreshold'
  | 'displayName'
  | 'globals'
  | 'globalSetup'
  | 'globalTeardown'
  | 'projects'
  | 'setupFiles'
  | 'setupFilesAfterEnv'
  | 'snapshotSerializers'
  | 'testEnvironment'
  | 'testPathIgnorePatterns'
  | 'testTimeout'
  | 'watchPathIgnorePatterns';

export const extensionsModuleMapper = {
  // https://github.com/kulshekhar/ts-jest/issues/1057#issuecomment-1482644543
  '^(\\.\\.?\\/.+)\\.jsx?$': '$1',
};

/**
 * Merge additional Jest options into the **skuba** preset.
 *
 * This concatenates array options like `testPathIgnorePatterns`.
 */
export const mergePreset = <
  AdditionalOptions extends keyof Config.InitialOptions,
>({
  projects,
  ...options
}: Pick<
  Config.InitialOptions,
  AdditionalOptions | DefaultOptions
>): Config.InitialOptions => {
  const fixedOptions: Config.InitialOptions = {
    moduleNameMapper: extensionsModuleMapper,
  };

  const defaultOptions = mergeRaw(fixedOptions, options);
  const root = mergeRaw(jestPreset, defaultOptions);

  return {
    ...root,

    projects: projects?.map((project) => {
      if (typeof project === 'string') {
        return project;
      }

      return {
        moduleNameMapper: root.moduleNameMapper,
        transform: root.transform,
        ...project,
      };
    }),
  };
};
