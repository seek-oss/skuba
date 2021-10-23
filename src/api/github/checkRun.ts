import { paths } from '@octokit/openapi-types';
import axios from 'axios';

import { createBatches } from '../../utils/batch';

type CreateCheckRunParameters =
  paths['/repos/{owner}/{repo}/check-runs']['post']['requestBody']['content']['application/json'];

type CreateCheckRunResponse =
  paths['/repos/{owner}/{repo}/check-runs']['post']['responses']['201']['content']['application/json'];

type UpdateCheckRunParameters =
  paths['/repos/{owner}/{repo}/check-runs/{check_run_id}']['patch']['requestBody']['content']['application/json'];

type UpdateCheckRunResponse =
  paths['/repos/{owner}/{repo}/check-runs/{check_run_id}']['patch']['responses']['200']['content']['application/json'];

type Output = NonNullable<CreateCheckRunParameters['output']>;
type Annotations = NonNullable<Output>['annotations'];
type Annotation = NonNullable<Annotations>[number];

const GITHUB_MAX_ANNOTATIONS_PER_CALL = 50;

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
const ownerRepoRegex = new RegExp(/github.com(?::|\/)(.*).git/);

const getOwnerRepoString = (): string => {
  const match = ownerRepoRegex.exec(process.env.BUILDKITE_REPO as string);
  const ownerRepoString = match?.[1];

  if (!ownerRepoString) {
    throw new Error(
      'Could not extract Github owner/repo from BUILDKITE_REPO environment variable',
    );
  }

  return ownerRepoString;
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

  const client = axios.create({
    headers: {
      Accept: 'application/vnd.github.v3+json',
      Authorization: `token ${process.env.GITHUB_API_TOKEN as string}`,
    },
    baseURL: `https://api.github.com/repos/${getOwnerRepoString()}/check-runs`,
  });

  const annotationBatches = createBatches(
    annotations,
    GITHUB_MAX_ANNOTATIONS_PER_CALL,
  );

  const createData: CreateCheckRunParameters = {
    name,
    output: {
      title,
      summary,
      annotations: annotationBatches.length ? annotationBatches[0] : [],
    },
    head_sha: process.env.BUILDKITE_COMMIT as string,
    conclusion,
  };

  const result = await client.post<CreateCheckRunResponse>('/', {
    data: createData,
  });

  // Add the other annotations to the result
  await Promise.all(
    annotationBatches.slice(1).map(async (batch) => {
      const updateData: UpdateCheckRunParameters = {
        output: {
          title,
          summary,
          annotations: batch,
        },
      };

      await client.patch<UpdateCheckRunResponse>(`/${result.data.id}`, {
        data: updateData,
      });
    }),
  );
};

export { isGithubAnnotationsEnabled, createCheckRun };

export type {
  Annotation,
  CreateCheckRunParameters,
  UpdateCheckRunParameters,
  CreateCheckRunResponse,
};
