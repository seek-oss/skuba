import { Octokit } from '@octokit/rest';
import { Endpoints } from '@octokit/types';

type CreateCheckRunParameters =
  Endpoints['POST /repos/{owner}/{repo}/check-runs']['parameters'];

type Output = NonNullable<CreateCheckRunParameters['output']>;

type Annotations = NonNullable<Output['annotations']>;

export type Annotation = Annotations[number];

interface OwnerRepo {
  owner: string;
  repo: string;
}

const GITHUB_MAX_ANNOTATIONS = 50;

const isGitHubAnnotationsEnabled = (): boolean =>
  Boolean(
    process.env.BUILDKITE_REPO &&
      process.env.BUILDKITE_COMMIT &&
      process.env.BUILDKITE_BUILD_NUMBER &&
      process.env.GITHUB_API_TOKEN,
  );
// Pulls out the GitHub Owner + Repo String from repo urls eg.
// git@github.com:seek-oss/skuba.git
// https://github.com/seek-oss/skuba.git
// Pulls out seek-oss/skuba
const ownerRepoRegex = new RegExp(/github.com(?::|\/)(.*)\/(.*).git/);

const getOwnerRepo = (): OwnerRepo => {
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
 * Create a uniform title format for our check runs
 * @param conclusion - `failure` or `success`
 * @param annotationsLength - Number of annotations added
 * @returns Title eg. Build #12 failed (24 annotations added)
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
 * Adds more context to the summary provided
 * @param summary - report summary
 * @param annotationsLength - Number of annotations added
 * @returns summary with extra metadata
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

/**
 * Creates a Check Run
 * @param name - Name of the Check Run
 * @param summary - Summary of the report
 * @param annotations - List of annotations
 * @param conclusion - Conclusion of the run
 */
export const createCheckRun = async (
  name: string,
  summary: string,
  annotations: Annotation[],
  conclusion: 'failure' | 'success',
): Promise<void> => {
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
    head_sha: process.env.BUILDKITE_COMMIT as string,
    conclusion,
  });
};
