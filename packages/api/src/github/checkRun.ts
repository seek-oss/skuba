import { pluralise } from '../../../../src/utils/logging.js';
import * as Git from '../git/index.js';

import { apiTokenFromEnvironment } from './environment.js';
import { createRestClient } from './octokit.js';

/**
 * GitHub check run annotation object
 *
 * @see https://docs.github.com/en/rest/checks/runs?apiVersion=2022-11-28#list-check-run-annotations--code-samples
 */
export interface Annotation {
  /**
   * The path of the file to add an annotation to.
   */
  path: string;

  /**
   * The start line of the annotation.
   */
  start_line: number;

  /**
   * The end line of the annotation.
   */
  end_line: number;

  /**
   * The start column of the annotation. Annotations only support
   * start_column and end_column on the same line. Omit this parameter
   * if start_line and end_line have different values.
   */
  start_column?: number;

  /**
   * The end column of the annotation. Annotations only support
   * start_column and end_column on the same line. Omit this parameter
   * if start_line and end_line have different values.
   */
  end_column?: number;

  /**
   * The level of the annotation.
   */
  annotation_level: 'notice' | 'warning' | 'failure';

  /**
   * A short description of the feedback for these lines of code.
   */
  message: string;

  /**
   * The title that represents the annotation.
   */
  title?: string;

  /**
   * Details about this annotation.
   */
  raw_details?: string;
}

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

  const client = await createRestClient({ auth: apiTokenFromEnvironment() });

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
