import { Octokit } from '@octokit/rest';
import { Endpoints } from '@octokit/types';

import { pluralise } from '../../utils/logging';

import { getHeadSha, getOwnerRepo } from './util';

type Output = NonNullable<
  Endpoints['POST /repos/{owner}/{repo}/check-runs']['parameters']['output']
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

interface CreateCheckRunParameters {
  annotations: Annotation[];
  conclusion: 'failure' | 'success';
  name: string;
  summary: string;
  title: string;
}

/**
 * Asynchronously creates a GitHub [check run] with annotations.
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
  title,
}: CreateCheckRunParameters): Promise<void> => {
  const dir = process.cwd();

  const [headSha, { owner, repo }] = await Promise.all([
    getHeadSha(dir),
    getOwnerRepo(dir),
  ]);

  const client = new Octokit({
    auth: process.env.GITHUB_API_TOKEN ?? process.env.GITHUB_TOKEN,
  });

  await client.checks.create({
    conclusion,
    head_sha: headSha,
    name,
    output: {
      annotations: annotations.slice(0, GITHUB_MAX_ANNOTATIONS),
      summary: createEnrichedSummary(summary, annotations.length),
      title: suffixTitle(title, annotations.length),
    },
    owner,
    repo,
  });
};
