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
 * The Jest preset for **skuba**. Also accessible via:
 *
 * ```javascript
 * module.exports = {
 *   preset: 'skuba',
 * };
 * ```
 *
 * You can extend the preset by passing in additional options.
 */
export const preset = Object.assign(
  jestPreset,

  /**
   * Extend the **skuba** Jest preset with additional options.
   *
   * This concatenates array options like `testPathIgnorePatterns`.
   */
  (props: Props): Config.InitialOptions => mergeRaw(jestPreset, props),
);
