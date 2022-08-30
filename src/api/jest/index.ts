import type { Config } from '@jest/types';

import jestPreset from '../../../jest-preset';
import { mergeRaw } from '../../cli/configure/processing/record';

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

/**
 * Merge additional Jest options into the **skuba** preset.
 *
 * This concatenates array options like `testPathIgnorePatterns`.
 */
export const mergePreset = <
  AdditionalOptions extends keyof Config.InitialOptions,
>(
  options: Pick<Config.InitialOptions, AdditionalOptions | DefaultOptions>,
): Config.InitialOptions => mergeRaw(jestPreset, options);
