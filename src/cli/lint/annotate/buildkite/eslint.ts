import type { ESLintOutput } from '../../../adapter/eslint.js';

import { Buildkite } from '@skuba-lib/api';

export const createEslintAnnotations = (eslint: ESLintOutput): string[] =>
  !eslint.ok ? ['**ESLint**', Buildkite.md.terminal(eslint.output.trim())] : [];
