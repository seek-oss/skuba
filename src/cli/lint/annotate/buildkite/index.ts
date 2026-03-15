import type { ESLintOutput } from "../../../adapter/eslint.js";
import type { OxfmtOutput } from "../../../adapter/oxfmt.js";
import type { StreamInterceptor } from "../../../lint/external.js";
import type { InternalLintResult } from "../../internal.js";

import { createEslintAnnotations } from "./eslint.js";
import { createInternalAnnotations } from "./internal.js";
import { createOxfmtAnnotations } from "./oxfmt.js";
import { createTscAnnotations } from "./tsc.js";

import * as Buildkite from "@skuba-lib/api/buildkite";
export const createBuildkiteAnnotations = async (
  internal: InternalLintResult,
  eslint: ESLintOutput,
  oxfmt: OxfmtOutput,
  tscOk: boolean,
  tscOutputStream: StreamInterceptor,
): Promise<void> => {
  if (internal.ok && eslint.ok && oxfmt.ok && tscOk) {
    return;
  }

  const buildkiteOutput = [
    "`skuba lint` found issues that require triage:",
    ...createInternalAnnotations(internal),
    ...createEslintAnnotations(eslint),
    ...createOxfmtAnnotations(oxfmt),
    ...createTscAnnotations(tscOk, tscOutputStream),
  ].join("\n\n");

  await Buildkite.annotate(buildkiteOutput, {
    context: "skuba-lint",
    scopeContextToStep: true,
    style: "error",
  });
};
