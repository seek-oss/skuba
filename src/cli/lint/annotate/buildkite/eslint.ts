import * as Buildkite from '@skuba-lib/api/buildkite';

import type { ESLintOutput } from '../../../adapter/eslint.ts';

export const createEslintAnnotations = (eslint: ESLintOutput): string[] =>
  !eslint.ok ? ['**ESLint**', Buildkite.md.terminal(eslint.output.trim())] : [];
