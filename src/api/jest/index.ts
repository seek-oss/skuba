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
  | 'snapshotSerializers'
  | 'testEnvironment'
  | 'testPathIgnorePatterns'
  | 'testTimeout'
  | 'watchPathIgnorePatterns'
>;

/**
 * Merge additional Jest options into the **skuba** preset.
 *
 * This concatenates array options like `testPathIgnorePatterns`.
 */
export const mergePreset = (props: Props): Config.InitialOptions =>
  mergeRaw(jestPreset, props);
