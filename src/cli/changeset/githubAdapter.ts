import { Octokit } from '@octokit/rest';

export const getOctokit = (token: string) => new Octokit({ auth: token });
