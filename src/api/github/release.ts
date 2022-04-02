import { Octokit } from '@octokit/rest';

import * as Git from '../git';

import { apiTokenFromEnvironment } from './environment';

/**
 * https://docs.github.com/en/rest/reference/releases#create-a-release
 */
interface CreateReleaseParameters {
  /**
   * The name of the release
   */
  releaseName: string;

  /**
   * The name of the tag
   */
  tagName: string;

  /**
   * The changelog for the release
   */
  changelog: string;

  /**
   * Flag to set this release as a pre-release
   */
  isPrerelease: boolean;
}

/**
 * Creates a release on GitHub
 */
export const createRelease = async (
  params: CreateReleaseParameters,
): Promise<void> => {
  const dir = process.cwd();

  const { owner, repo } = await Git.getOwnerAndRepo({ dir });

  const client = new Octokit({ auth: apiTokenFromEnvironment() });

  await client.repos.createRelease({
    owner,
    repo,
    name: params.releaseName,
    tag_name: params.tagName,
    body: params.changelog,
    prerelease: params.isPrerelease,
  });
};
