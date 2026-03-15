/* eslint-disable no-console */

import path from "path";

import { log } from "../../utils/logging.js";

import { runOxfmt } from "./oxfmt.js";

describe("runOxfmt", () => {
  const originalCwd = process.cwd();

  afterAll(() =>
    // Restore the original working directory to avoid confusion in other tests.
    process.chdir(originalCwd),
  );

  const originalConsoleLog = console.log;

  beforeAll(() => (console.log = () => undefined));
  afterAll(() => (console.log = originalConsoleLog));

  it("flags files that need formatting in lint mode", async () => {
    process.chdir(path.join(__dirname, "../../.."));

    const result = await runOxfmt(
      "lint",
      log,
      path.join(__dirname, "../../../integration/base/fixable"),
    );

    expect(result.ok).toBe(false);
    expect(result.result.errored.length).toBeGreaterThan(0);
    expect(result.result.errored.map((e) => e.filepath)).toContain("integration/base/fixable/d.js");
  });

  it("handles a custom directory with a different root", async () => {
    process.chdir(__dirname);

    const result = await runOxfmt(
      "lint",
      log,
      path.join(__dirname, "../../../integration/base/fixable"),
    );

    expect(result.ok).toBe(false);
    expect(result.result.errored.length).toBeGreaterThan(0);
  });
});
