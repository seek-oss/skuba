import type { RequestParameters } from '@octokit/types';

export const graphql = async <ResponseData>(
  query: string,
  parameters?: RequestParameters,
) =>
  (await import('@octokit/graphql')).graphql<ResponseData>(query, parameters);
