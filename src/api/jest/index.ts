import { Config } from '@jest/types';

import jestPreset from '../../../jest-preset';
import { mergeRaw } from '../../cli/configure/processing/record';

type Props = Pick<
  Config.InitialOptions,
  | 'collectCoverage'
  | 'collectCoverageFrom'
  | 'collectCoverageOnlyFrom'
  | 'coveragePathIgnorePatterns'
  | 'coverageThreshold'
  | 'globals'
  | 'globalSetup'
  | 'globalTeardown'
  | 'setupFiles'
  | 'setupFilesAfterEnv'
  | 'testPathIgnorePatterns'
>;

/**
 * Extend the **skuba** preset with custom options.
 *
 * This concatenates array options like `testPathIgnorePatterns`.
 */
export const extend = (props?: Props): Config.InitialOptions =>
  mergeRaw(jestPreset, props);
