import semanticRelease from 'semantic-release';

import { log } from '../utils/logging';

const DEFAULT_BRANCH =
  process.env.DEFAULT_BRANCH_NAME ||
  process.env.BUILDKITE_PIPELINE_DEFAULT_BRANCH ||
  'master';

/**
 * {@link https://semantic-release.gitbook.io/semantic-release/usage/configuration#branches}
 */
const BRANCHES = [
  '+([0-9])?(.{+([0-9]),x}).x',
  DEFAULT_BRANCH,
  'next',
  'next-major',
  {
    name: 'beta',
    prerelease: true,
  },
  {
    name: 'alpha',
    prerelease: true,
  },
];

export const release = async () => {
  const result = await semanticRelease({
    branches: BRANCHES,
  });

  if (!result) {
    return log.plain('Release skipped.');
  }

  const { type, version } = result.nextRelease;

  log.ok('Released', type, 'version', log.bold(version));
};
