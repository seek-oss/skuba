import type { ESLintOutput } from '../../../adapter/eslint.ts';

import * as Buildkite from '@skuba-lib/api/buildkite';

export const createEslintAnnotations = (eslint: ESLintOutput): string[] =>
  !eslint.ok ? ['**ESLint**', Buildkite.md.terminal(eslint.output.trim())] : [];
