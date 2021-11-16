import * as Buildkite from '../../../../api/buildkite';
import type { ESLintOutput } from '../../../../cli/adapter/eslint';

export const createEslintAnnotations = (eslint: ESLintOutput): string[] =>
  !eslint.ok ? ['**ESLint**', Buildkite.md.terminal(eslint.output.trim())] : [];
