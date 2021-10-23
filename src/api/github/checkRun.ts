import { Octokit } from '@octokit/rest';
import { Endpoints } from '@octokit/types';

import { createBatches } from '../../utils/batch';
import { log } from '../../utils/logging';

type CreateCheckRunParameters =
  Endpoints['POST /repos/{owner}/{repo}/check-runs']['parameters'];

type CreateCheckRunResponse =
  Endpoints['POST /repos/{owner}/{repo}/check-runs']['response'];

type UpdateCheckRunParameters =
  Endpoints['PATCH /repos/{owner}/{repo}/check-runs/{check_run_id}']['parameters'];

type Output = NonNullable<CreateCheckRunParameters['output']>;

type Annotations = NonNullable<Output['annotations']>;

type Annotation = Annotations[number];

interface OwnerRepo {
  owner: string;
  repo: string;
}

const GITHUB_MAX_ANNOTATIONS_PER_CALL = 50;
const GITHUB_MAX_ANNOTATIONS = 200;

const isGithubAnnotationsEnabled = (): boolean =>
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
      'Could not extract Github owner/repo from BUILDKITE_REPO environment variable',
    );
  }

  return {
    owner,
    repo,
  };
};

/**
 * Creates a Check Run
 * @param name - Name of the Check Run
 * @param title - Title of the report
 * @param summary - Summary of the report
 * @param annotations - List of annotations
 * @param conclusion - Conclusion of the run
 */
const createCheckRun = async (
  name: string,
  title: string,
  summary: string,
  annotations: Annotation[],
  conclusion: CreateCheckRunParameters['conclusion'],
): Promise<void> => {
  if (!isGithubAnnotationsEnabled()) {
    return;
  }

  const client = new Octokit({
    auth: process.env.GITHUB_API_TOKEN,
  });

  if (annotations.length > GITHUB_MAX_ANNOTATIONS) {
    log.warn(
      `There are ${annotations.length} annotations. Capping the number of annotations to ${GITHUB_MAX_ANNOTATIONS}`,
    );
  }

  const annotationBatches = createBatches(
    annotations.slice(0, GITHUB_MAX_ANNOTATIONS_PER_CALL),
    GITHUB_MAX_ANNOTATIONS_PER_CALL,
  );

  const { owner, repo } = getOwnerRepo();

  const createParams: CreateCheckRunParameters = {
    owner,
    repo,
    name,
    output: {
      title,
      summary,
      annotations: annotationBatches.length ? annotationBatches[0] : [],
    },
    head_sha: process.env.BUILDKITE_COMMIT as string,
    conclusion,
  };

  const result = await client.checks.create(createParams);

  // Add the other annotations to the result
  await Promise.all(
    annotationBatches.slice(1).map(async (batch) => {
      const updateParams: UpdateCheckRunParameters = {
        owner,
        repo,
        check_run_id: result.data.id,
        output: {
          title,
          summary,
          annotations: batch,
        },
      };

      await client.checks.update(updateParams);
    }),
  );
};

export { isGithubAnnotationsEnabled, createCheckRun, GITHUB_MAX_ANNOTATIONS };

export type {
  Annotation,
  CreateCheckRunParameters,
  CreateCheckRunResponse,
  UpdateCheckRunParameters,
};
