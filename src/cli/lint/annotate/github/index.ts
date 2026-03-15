import type { ESLintOutput } from "../../../adapter/eslint.js";
import type { OxfmtOutput } from "../../../adapter/oxfmt.js";
import type { StreamInterceptor } from "../../../lint/external.js";
import type { InternalLintResult } from "../../internal.js";

import { createEslintAnnotations } from "./eslint.js";
import { createInternalAnnotations } from "./internal.js";
import { createOxfmtAnnotations } from "./oxfmt.js";
import { createTscAnnotations } from "./tsc.js";

import * as GitHub from "@skuba-lib/api/github";

export const createGitHubAnnotations = async (
  internal: InternalLintResult,
  eslint: ESLintOutput,
  oxfmt: OxfmtOutput,
  tscOk: boolean,
  tscOutputStream: StreamInterceptor,
) => {
  if (!GitHub.enabledFromEnvironment()) {
    return;
  }

  const annotations: GitHub.Annotation[] = [
    ...createInternalAnnotations(internal),
    ...createEslintAnnotations(eslint),
    ...createOxfmtAnnotations(oxfmt),
    ...createTscAnnotations(tscOk, tscOutputStream),
  ];

  const isOk = eslint.ok && oxfmt.ok && internal.ok && tscOk;

  const summary = isOk ? "`skuba lint` passed." : "`skuba lint` found issues that require triage.";

  const build = GitHub.buildNameFromEnvironment();

  await GitHub.createCheckRun({
    name: "skuba/lint",
    summary,
    annotations,
    conclusion: isOk ? "success" : "failure",
    title: `${build} ${isOk ? "passed" : "failed"}`,
  });
};
