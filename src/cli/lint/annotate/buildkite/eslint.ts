import { Buildkite } from '../../../..';
import { ESLintOutput } from '../../../../cli/adapter/eslint';

const createEslintAnnotations = (eslint: ESLintOutput): string[] => {
  const annotations: string[] = [];

  if (!eslint.ok) {
    annotations.push('**ESLint**', Buildkite.md.terminal(eslint.output.trim()));
  }

  return annotations;
};

export { createEslintAnnotations };
