import type { Config } from '@jest/types';

import jestPreset from '../../../jest-preset';
import { mergeRaw } from '../../cli/configure/processing/record';

type Props = Pick<
  Config.InitialOptions,
  | 'collectCoverage'
  | 'collectCoverageFrom'
  | 'collectCoverageOnlyFrom'
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
  | 'watchPathIgnorePatterns'
>;

/**
 * Merge additional Jest options into the **skuba** preset.
 *
 * This concatenates array options like `testPathIgnorePatterns`.
 */
export const mergePreset = <
  AdditionalProps extends Partial<Config.InitialOptions>,
>(
  props: AdditionalProps & Props,
): Config.InitialOptions => mergeRaw(jestPreset, props);
