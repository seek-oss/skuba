import type { Octokit } from '@octokit/rest' with { 'resolution-mode': 'import' };
import type { RequestParameters } from '@octokit/types';

export const createRestClient = async (options: {
  auth: unknown;
}): Promise<Octokit> => new (await import('@octokit/rest')).Octokit(options);

export const graphql = async <ResponseData>(
  query: string,
  parameters?: RequestParameters,
) =>
  (await import('@octokit/graphql')).graphql<ResponseData>(query, parameters);
