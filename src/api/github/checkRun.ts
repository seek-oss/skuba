import { Octokit } from '@octokit/rest';
import { Endpoints } from '@octokit/types';
import fs from 'fs-extra';
import git from 'isomorphic-git';

type Output = NonNullable<
  Endpoints['POST /repos/{owner}/{repo}/check-runs']['parameters']['output']
>;

export type Annotation = NonNullable<Output['annotations']>[number];

const GITHUB_MAX_ANNOTATIONS = 50;

const isGitHubAnnotationsEnabled = (): boolean =>
  Boolean(
    process.env.BUILDKITE &&
      process.env.BUILDKITE_BUILD_NUMBER &&
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

const getOwnerRepo = async (
  dir: string,
): Promise<{ owner: string; repo: string }> => {
  const remotes = await git.listRemotes({ dir, fs });

  for (const { url } of remotes) {
    const match = ownerRepoRegex.exec(url);

    const owner = match?.[1];
    const repo = match?.[2];

    if (owner && repo) {
      return { owner, repo };
    }
  }

  throw new Error('Could not find a GitHub remote');
};

const getHeadSha = async (dir: string): Promise<string> => {
  const [commit] = await git.log({ depth: 1, dir, fs });

  return commit.oid;
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
  annotations: Annotation[];
  conclusion: 'failure' | 'success';
  name: string;
  summary: string;
}

/**
 * Asynchronously creates a GitHub [check run] with annotations.
 *
 * This writes the first 50 `annotations` in full to GitHub.
 *
 * If the following environment variables are not present,
 * the function will silently return without attempting to annotate:
 *
 * - `BUILDKITE`
 * - `BUILDKITE_BUILD_NUMBER`
 * - `GITHUB_API_TOKEN`
 */
export const createCheckRunFromBuildkite = async ({
  annotations,
  conclusion,
  name,
  summary,
}: CreateCheckRunParameters): Promise<void> => {
  if (!isGitHubAnnotationsEnabled()) {
    return;
  }

  const dir = process.cwd();

  const [headSha, { owner, repo }] = await Promise.all([
    getHeadSha(dir),
    getOwnerRepo(dir),
  ]);

  const client = new Octokit({ auth: process.env.GITHUB_API_TOKEN });

  const output = {
    annotations: annotations.slice(0, GITHUB_MAX_ANNOTATIONS),
    summary: createEnrichedSummary(summary, annotations.length),
    title: createTitle(conclusion, annotations.length),
  };

  await client.checks.create({
    conclusion,
    head_sha: headSha,
    name,
    output,
    owner,
    repo,
  });
};
