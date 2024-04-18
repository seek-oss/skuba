import { Octokit } from '@octokit/rest';
import type { Endpoints } from '@octokit/types';

import { pluralise } from '../../utils/logging';
import * as Git from '../git';

import { apiTokenFromEnvironment } from './environment';

type Output = NonNullable<
  Endpoints['PATCH /repos/{owner}/{repo}/check-runs/{check_run_id}']['parameters']['output']
>;

export type Annotation = NonNullable<Output['annotations']>[number];

const GITHUB_MAX_ANNOTATIONS = 50;

/**
 * Suffixes the title with the number of annotations added, e.g.
 *
 * ```text
 * Build #12 failed (24 annotations added)
 * ```
 */
const suffixTitle = (title: string, inputAnnotations: number): string => {
  const addedAnnotations =
    inputAnnotations > GITHUB_MAX_ANNOTATIONS
      ? GITHUB_MAX_ANNOTATIONS
      : inputAnnotations;

  return `${title} (${pluralise(addedAnnotations, 'annotation')} added)`;
};

/**
 * Enriches the summary with more context about the check run.
 */
const createEnrichedSummary = (
  summary: string,
  inputAnnotations: number,
): string =>
  [
    summary,
    ...(inputAnnotations > GITHUB_MAX_ANNOTATIONS
      ? [
          `${inputAnnotations} annotations were provided, but only the first ${GITHUB_MAX_ANNOTATIONS} are visible in GitHub.`,
        ]
      : []),
  ].join('\n\n');

/**
 * {@link https://docs.github.com/en/rest/reference/checks#create-a-check-run}
 */
interface CreateCheckRunParameters {
  /**
   * Adds information from your analysis to specific lines of code.
   * Annotations are visible on GitHub in the **Checks** and **Files changed**
   * tab of the pull request.
   */
  annotations: Annotation[];

  /**
   * The final conclusion of the check.
   */
  conclusion: 'failure' | 'success';

  /**
   * The name of the check. For example, "code-coverage".
   */
  name: string;

  /**
   * The summary of the check run. This parameter supports Markdown.
   */
  summary: string;

  /**
   * The details of the check run. This parameter supports Markdown.
   */
  text?: string;

  /**
   * The title of the check run.
   */
  title: string;
}

/**
 * Asynchronously creates a GitHub check run with annotations.
 *
 * The first 50 `annotations` are written in full to GitHub.
 *
 * A `GITHUB_API_TOKEN` or `GITHUB_TOKEN` with the `checks:write` permission
 * must be present on the environment.
 */
export const createCheckRun = async ({
  annotations,
  conclusion,
  name,
  summary,
  text,
  title,
}: CreateCheckRunParameters): Promise<void> => {
  const dir = process.cwd();

  const [commitId, { owner, repo }] = await Promise.all([
    Git.getHeadCommitId({ dir }),
    Git.getOwnerAndRepo({ dir }),
  ]);

  const client = new Octokit({ auth: apiTokenFromEnvironment() });

  await client.checks.create({
    conclusion,
    head_sha: commitId,
    name,
    output: {
      annotations: annotations.slice(0, GITHUB_MAX_ANNOTATIONS),
      summary: createEnrichedSummary(summary, annotations.length),
      text,
      title: suffixTitle(title, annotations.length),
    },
    owner,
    repo,
  });
};
