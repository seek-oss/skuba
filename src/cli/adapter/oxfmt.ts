import path from "path";

import fs from "fs-extra";

import { crawlDirectory } from "../../utils/dir.js";
import { type Logger, pluralise } from "../../utils/logging.js";
import { getConsumerManifest } from "../../utils/manifest.js";

interface Result {
  count: number;
  errored: Array<{ err?: unknown; filepath: string }>;
  touched: string[];
  unparsed: string[];
}

export interface OxfmtOutput {
  ok: boolean;
  result: Result;
}

/**
 * Formats/lints files with Oxfmt.
 */
export const runOxfmt = async (
  mode: "format" | "lint",
  logger: Logger,
  cwd = process.cwd(),
): Promise<OxfmtOutput> => {
  logger.debug("Initialising Oxfmt...");

  const { format } = await import("oxfmt");
  const start = process.hrtime.bigint();

  const manifest = await getConsumerManifest(cwd);

  const directory = manifest ? path.dirname(manifest.path) : cwd;

  logger.debug(manifest ? "Detected project root:" : "Detected working directory:", directory);

  logger.debug("Discovering files...");

  const relativeFilepaths = await crawlDirectory(directory, [
    ".gitignore",
    ".prettierignore",
    ".oxfmtignore",
  ]);

  logger.debug(`Discovered ${pluralise(relativeFilepaths.length, "file")}.`);

  const result: Result = {
    count: relativeFilepaths.length,
    errored: [],
    touched: [],
    unparsed: [],
  };

  logger.debug(mode === "format" ? "Formatting" : "Linting", "files...");

  for (const relativeFilepath of relativeFilepaths) {
    const filepath = path.relative(process.cwd(), path.join(directory, relativeFilepath));

    logger.debug(filepath);

    let data: string;
    try {
      data = await fs.promises.readFile(filepath, "utf-8");
    } catch (err) {
      result.errored.push({ err, filepath });
      continue;
    }

    let formatted: string;
    let hasErrors: boolean;
    try {
      const formatResult = await format(filepath, data);
      hasErrors = formatResult.errors.length > 0;

      const isUnsupported = formatResult.errors.some((e) =>
        e.message.startsWith("Unsupported file type"),
      );

      if (isUnsupported) {
        logger.debug("  unsupported, skipping");
        result.unparsed.push(filepath);
        continue;
      }

      if (hasErrors) {
        const errorMessages = formatResult.errors.map((e) => e.message).join("; ");
        result.errored.push({
          err: new Error(errorMessages),
          filepath,
        });
        continue;
      }

      formatted = formatResult.code;
    } catch (err) {
      result.errored.push({ err, filepath });
      continue;
    }

    if (mode === "lint") {
      if (formatted !== data) {
        result.errored.push({ filepath });
      }
      continue;
    }

    if (formatted === data) {
      continue;
    }

    result.touched.push(filepath);
    await fs.promises.writeFile(filepath, formatted);
  }

  const end = process.hrtime.bigint();

  logger.plain(
    `Processed ${pluralise(
      result.count - result.unparsed.length,
      "file",
    )} in ${logger.timing(start, end)}.`,
  );

  if (result.touched.length) {
    logger.plain(`Formatted ${pluralise(result.touched.length, "file")}:`);
    for (const filepath of result.touched) {
      logger.warn(filepath);
    }
  }

  if (result.errored.length) {
    logger.plain(`Flagged ${pluralise(result.errored.length, "file")}:`);
    for (const { err, filepath } of result.errored) {
      logger.warn(
        filepath,
        ...(typeof err === "string" || err instanceof Error ? [String(err)] : []),
      );
    }
  }

  return { ok: result.errored.length === 0, result };
};
