import { Config } from '@jest/types';

import jestPreset from '../../../jest-preset.js';
import { mergeRaw } from '../../cli/configure/processing/record.js';

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
  | 'testTimeout'
>;

/**
 * Merge additional Jest options into the **skuba** preset.
 *
 * This concatenates array options like `testPathIgnorePatterns`.
 */
export const mergePreset = (props: Props): Config.InitialOptions =>
  mergeRaw(jestPreset, props);
