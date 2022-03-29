import { Octokit } from '@octokit/rest';

import { apiTokenFromEnvironment } from '../../api/github/environment';

export const getOctokit = () =>
  new Octokit({ auth: apiTokenFromEnvironment() });
