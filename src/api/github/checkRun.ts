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
  inputAnnotations: number,
): string => {
  const build = `Build #${process.env.BUILDKITE_BUILD_NUMBER as string}`;
  const addedAnnotations =
    inputAnnotations > GITHUB_MAX_ANNOTATIONS
      ? GITHUB_MAX_ANNOTATIONS
      : inputAnnotations;
  const status = conclusion === 'success' ? 'passed' : 'failed';

  const plural = addedAnnotations === 1 ? '' : 's';
  return `${build} ${status} (${addedAnnotations} annotation${plural} added)`;
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
  name: string;
  summary: string;
  annotations: Annotation[];
  conclusion: 'failure' | 'success';
}

/**
 * Asynchronously creates a GitHub [check run] with annotations.
 *
 * This writes the first 50 `annotations` in full to GitHub.
 *
 * If the following environment variables are not present,
 * the function will silently return without attempting to annotate:
 *
 * - `BUILDKITE_BUILD_NUMBER`
 * - `BUILDKITE_COMMIT`
 * - `BUILDKITE_REPO`
 * - `GITHUB_API_TOKEN`
 */
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

  await client.checks.create({
    owner,
    repo,
    name,
    output: {
      title,
      summary: enrichedSummary,
      annotations: annotations.slice(0, GITHUB_MAX_ANNOTATIONS),
    },
    head_sha: process.env.BUILDKITE_COMMIT!,
    conclusion,
  });
};
