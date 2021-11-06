import { Octokit } from '@octokit/rest';
import { Endpoints } from '@octokit/types';

type Output = NonNullable<
  Endpoints['POST /repos/{owner}/{repo}/check-runs']['parameters']['output']
>;

export type Annotation = NonNullable<Output['annotations']>[number];

const GITHUB_MAX_ANNOTATIONS = 50;

const isGitHubAnnotationsEnabled = (): boolean =>
  Boolean(
    process.env.BUILDKITE_BUILD_NUMBER &&
      process.env.BUILDKITE_COMMIT &&
      process.env.BUILDKITE_REPO &&
      process.env.GITHUB_API_TOKEN,
  );

/**
 * Matches the owner and repository names in a GitHub repository URL.
 *
 * For example, given the following input strings:
 *
 * ```console
 * git@github.com:seek-oss/skuba.git
 * https://github.com/seek-oss/skuba.git
 * ```
 *
 * This pattern will produce the following matches:
 *
 * 1. seek-oss
 * 2. skuba
*/
const ownerRepoRegex = /github.com(?::|\/)(.+)\/(.+).git$/;

const getOwnerRepo = (): { owner: string; repo: string } => {
  const match = ownerRepoRegex.exec(process.env.BUILDKITE_REPO as string);
  const owner = match?.[1];
  const repo = match?.[2];

  if (!owner || !repo) {
    throw new Error(
      'Could not extract GitHub owner/repo from BUILDKITE_REPO environment variable',
    );
  }

  return {
    owner,
    repo,
  };
};

/**
 * Create a uniform title format for our check runs, e.g.
 *
 * ```text
 * Build #12 failed (24 annotations added)
 * ```
 */
const createTitle = (
  conclusion: 'failure' | 'success',
  annotationsLength: number,
): string => {
  const build = `Build #${process.env.BUILDKITE_BUILD_NUMBER as string}`;
  const numAnnotations =
    annotationsLength > GITHUB_MAX_ANNOTATIONS
      ? GITHUB_MAX_ANNOTATIONS
      : annotationsLength;
  const status = conclusion === 'success' ? 'passed' : 'failed';

  const plural = numAnnotations === 1 ? '' : 's';
  return `${build} ${status} (${numAnnotations} annotation${plural} added)`;
};

/**
 * Enriches the summary with more context about the check run.
 */
const createEnrichedSummary = (
  summary: string,
  annotationsLength: number,
): string =>
  [
    summary,
    ...(annotationsLength > GITHUB_MAX_ANNOTATIONS
      ? [
          `There were ${annotationsLength} annotations created. However, the number of annotations displayed has been capped to ${GITHUB_MAX_ANNOTATIONS}`,
        ]
      : []),
  ].join('\n\n');

interface CreateCheckRunParameters {
  name: string;
  summary: string;
  annotations: Annotation[];
  conclusion: 'failure' | 'success';
}

export const createCheckRunFromBuildkite = async ({
  name,
  summary,
  annotations,
  conclusion,
}: CreateCheckRunParameters): Promise<void> => {
  if (!isGitHubAnnotationsEnabled()) {
    return;
  }

  const client = new Octokit({
    auth: process.env.GITHUB_API_TOKEN,
  });
  const { owner, repo } = getOwnerRepo();
  const title = createTitle(conclusion, annotations.length);
  const enrichedSummary = createEnrichedSummary(summary, annotations.length);
  const checkRunName = `skuba/${name}`;

  await client.checks.create({
    owner,
    repo,
    name: checkRunName,
    output: {
      title,
      summary: enrichedSummary,
      annotations: annotations.slice(0, GITHUB_MAX_ANNOTATIONS),
    },
    head_sha: process.env.BUILDKITE_COMMIT as string,
    conclusion,
  });
};
