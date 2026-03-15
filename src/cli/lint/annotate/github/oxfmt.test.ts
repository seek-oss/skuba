import type { OxfmtOutput } from "../../../adapter/oxfmt.js";

import { createOxfmtAnnotations } from "./oxfmt.js";

import type * as GitHub from "@skuba-lib/api/github";

it("should create annotations from Oxfmt errors", () => {
  const oxfmtOutput: OxfmtOutput = {
    ok: false,
    result: {
      errored: [{ filepath: "src/index.ts" }],
      count: 1,
      touched: [],
      unparsed: [],
    },
  };

  const expectedAnnotations: GitHub.Annotation[] = [
    {
      annotation_level: "failure",
      start_line: 1,
      end_line: 1,
      path: "src/index.ts",
      message: "This file has not been formatted.",
      title: "Oxfmt",
    },
  ];

  const annotations = createOxfmtAnnotations(oxfmtOutput);

  expect(annotations).toStrictEqual(expectedAnnotations);
});

it("should create an empty annotations array if there are no errors", () => {
  const oxfmtOutput: OxfmtOutput = {
    ok: true,
    result: {
      errored: [],
      count: 1,
      touched: [],
      unparsed: [],
    },
  };

  const expectedAnnotations: GitHub.Annotation[] = [];

  const annotations = createOxfmtAnnotations(oxfmtOutput);

  expect(annotations).toStrictEqual(expectedAnnotations);
});

it("should create annotations for Oxfmt process errors", () => {
  const oxfmtOutput: OxfmtOutput = {
    ok: false,
    result: {
      errored: [{ err: new Error("OMG Oxfmt crashed"), filepath: "src/evil.ts" }],
      count: 1,
      touched: [],
      unparsed: [],
    },
  };

  const expectedAnnotations: GitHub.Annotation[] = [
    {
      annotation_level: "failure",
      start_line: 1,
      end_line: 1,
      path: "src/evil.ts",
      message: "OMG Oxfmt crashed",
      title: "Oxfmt",
    },
  ];

  const annotations = createOxfmtAnnotations(oxfmtOutput);

  expect(annotations).toStrictEqual(expectedAnnotations);
});
