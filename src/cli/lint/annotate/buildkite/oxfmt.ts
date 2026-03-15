import type { OxfmtOutput } from "../../../adapter/oxfmt.js";

import * as Buildkite from "@skuba-lib/api/buildkite";

export const createOxfmtAnnotations = (oxfmt: OxfmtOutput): string[] =>
  !oxfmt.ok
    ? [
        "**Oxfmt**",
        Buildkite.md.terminal(
          oxfmt.result.errored
            .map(({ err, filepath }) =>
              [
                filepath,
                ...(typeof err === "string" || err instanceof Error ? [String(err)] : []),
              ].join(" "),
            )
            .join("\n"),
        ),
      ]
    : [];
