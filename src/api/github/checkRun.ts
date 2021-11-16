import { Octokit } from '@octokit/rest';
import type { Endpoints } from '@octokit/types';
import fs from 'fs-extra';
import git from 'isomorphic-git';

import { pluralise } from '../../utils/logging';

type Output = NonNullable<
  Endpoints['POST /repos/{owner}/{repo}/check-runs']['parameters']['output']
>;

export type Annotation = NonNullable<Output['annotations']>[number];

const GITHUB_MAX_ANNOTATIONS = 50;

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
