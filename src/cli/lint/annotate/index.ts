import type { ESLintOutput } from "../../../cli/adapter/eslint.js";
import type { OxfmtOutput } from "../../../cli/adapter/oxfmt.js";
import type { StreamInterceptor } from "../external.js";
import type { InternalLintResult } from "../internal.js";

import { createBuildkiteAnnotations } from "./buildkite/index.js";
import { createGitHubAnnotations } from "./github/index.js";

export const createAnnotations = async (
  internal: InternalLintResult,
  eslint: ESLintOutput,
  oxfmt: OxfmtOutput,
  tscOk: boolean,
  tscOutputStream: StreamInterceptor,
): Promise<void> => {
  await Promise.all([
    createGitHubAnnotations(internal, eslint, oxfmt, tscOk, tscOutputStream),
    createBuildkiteAnnotations(internal, eslint, oxfmt, tscOk, tscOutputStream),
  ]);
};
