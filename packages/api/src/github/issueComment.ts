import type { Octokit } from '@octokit/rest' with {
  'resolution-mode': 'import',
};

import * as Git from '../git/index.js';

import { apiTokenFromEnvironment } from './environment.js';
import { createRestClient } from './octokit.js';
import { getPullRequestNumber } from './pullRequest.js';

const getUserId = async (client: Octokit): Promise<number> => {
  const { data } = await client.users.getAuthenticated();

  return data.id;
};

/**
 * https://docs.github.com/en/rest/reference/issues#create-an-issue-comment
 */
interface PutIssueCommentParameters {
  /**
   * The body of the issue comment.
   *
   * An explicit `null` value will remove the comment, if `internalId` is provided.
   */
  body: string | null;

  /**
   * An internal identifier for the issue comment.
   *
   * This can be used to scope a given `put` to a particular comment, preventing
   * it from clobbering other comments from the same bot or user.
   *
   * The identifier is embedded as hidden content in the comment body.
   */
  internalId?: string;

  env?: Record<string, string | undefined>;

  /**
   * The number that identifies the GitHub issue.
   *
   * If this is not provided, the number will be inferred from the GitHub Repos
   * API by finding the latest pull request associated with the head commit.
   *
   * https://docs.github.com/en/rest/reference/repos#list-pull-requests-associated-with-a-commit
   */
  issueNumber?: number;

  /**
   * The ID of authenticated bot or user that is putting the issue comment.
   *
   * This drives our `put` behaviour, which tries to locate and edit an existing
   * comment before creating a new one. If this is not provided, the ID will be
   * inferred from the GitHub Users API.
   *
   * https://docs.github.com/en/rest/reference/users#get-the-authenticated-user
   *
   * If you're at SEEK and using BuildAgency's GitHub API integration, you may
   * use `'seek-build-agency'` as an optimisation to skip the user lookup.
   *
   * https://api.github.com/users/buildagencygitapitoken[bot]
   */
  userId?: number | 'seek-build-agency';
}

interface IssueComment {
  id: number;
}

/**
 * Asynchronously creates or updates a GitHub issue comment.
 *
 * This emulates `put` behaviour by overwriting the first existing comment by
 * the same author on the issue, enabling use cases like a persistent bot
 * comment at the top of the pull request that reflects the current status of a
 * CI check.
 *
 * A `GITHUB_API_TOKEN` or `GITHUB_TOKEN` with write permissions must be present
 * on the environment.
 */
export const putIssueComment = async (
  params: PutIssueCommentParameters,
): Promise<IssueComment | null> => {
  if (params.body === null && !params.internalId) {
    // It's dangerous to just delete the first comment, as it may not be
    // from the current flow.
    throw new Error('Cannot remove comment without an internalId');
  }

  const env = params.env ?? process.env;

  const dir = process.cwd();

  const { owner, repo } = await Git.getOwnerAndRepo({ dir });

  const client = await createRestClient({ auth: apiTokenFromEnvironment() });

  const issueNumber =
    params.issueNumber ?? (await getPullRequestNumber({ client, env }));

  if (!issueNumber) {
    throw new Error('Failed to infer an issue number');
  }

  const comments = await client.issues.listComments({
    issue_number: issueNumber,
    owner,
    repo,
  });

  const userId: number =
    params.userId === 'seek-build-agency'
      ? // https://api.github.com/users/buildagencygitapitoken[bot]
        87109344
      : (params.userId ?? (await getUserId(client)));

  const commentId = comments.data.find(
    (comment) =>
      comment.user?.id === userId &&
      (params.internalId
        ? comment.body?.endsWith(`\n\n<!-- ${params.internalId} -->`)
        : true),
  )?.id;

  if (params.body === null) {
    if (commentId) {
      await client.issues.deleteComment({
        comment_id: commentId,
        owner,
        repo,
      });
    }

    return null;
  }

  const body = params.internalId
    ? [params.body.trim(), `<!-- ${params.internalId} -->`].join('\n\n')
    : params.body.trim();

  const response = await (commentId
    ? client.issues.updateComment({
        body,
        comment_id: commentId,
        issue_number: issueNumber,
        owner,
        repo,
      })
    : client.issues.createComment({
        body,
        issue_number: issueNumber,
        owner,
        repo,
      }));

  return {
    id: response.data.id,
  };
};
