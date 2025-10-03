import type { ESLintOutput } from '../../../adapter/eslint.js';

import * as Buildkite from '@skuba-lib/api/buildkite';

export const createEslintAnnotations = (eslint: ESLintOutput): string[] =>
  !eslint.ok ? ['**ESLint**', Buildkite.md.terminal(eslint.output.trim())] : [];
