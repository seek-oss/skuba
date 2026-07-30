import { stripVTControlCharacters } from 'node:util';

import { ExecaError } from 'execa';

import { isCiEnv } from '../../utils/env.js';
import { createExec, exec } from '../../utils/exec.js';
import type { Logger } from '../../utils/logging.js';

export type OxfmtError = {
  path: string;
  message: string;
  position?: {
    line: number;
    column: number;
  };
};

export type OxfmtResult =
  | {
      ok: true;
    }
  | {
      ok: false;
      execError?: string;
      errors?: OxfmtError[];
    };

export const runOxfmt = async (
  mode: 'format' | 'lint',
  logger: Logger,
  filePaths: string[] = [],
): Promise<OxfmtResult> => {
  if (mode === 'format') {
    try {
      await exec('oxfmt');
      return {
        ok: true,
      };
    } catch {
      return {
        ok: false,
      };
    }
  }

  try {
    await exec('oxfmt', '--check');
    return {
      ok: true,
    };
  } catch {
    if (!isCiEnv()) {
      return {
        ok: false,
      };
    }

    // Get the offending filepaths
    const customExec = createExec({
      stdio: 'pipe',
    });

    const invalidPaths: OxfmtError[] = [];

    try {
      await customExec('oxfmt', '--list-different', ...filePaths);
      return {
        ok: true,
      };
    } catch (error) {
      if (!(error instanceof ExecaError)) {
        logger.err(error);
        return {
          ok: false,
          execError: error instanceof Error ? error.message : 'Unknown error',
          errors: invalidPaths,
        };
      }

      if (typeof error.stdout === 'string') {
        stripVTControlCharacters(error.stdout)
          .split('\n')
          .forEach((path) => {
            if (path.length === 0) {
              return;
            }
            invalidPaths.push({
              path,
              message: 'Oxfmt found formatting issues in this file.',
            });
          });
      }

      if (error.exitCode === 2 && typeof error.stderr === 'string') {
        const stderr = stripVTControlCharacters(error.stderr);

        // Oxlint reports one parse error per file as a block of lines (e.g.
        // "  x Expected `from` but found `;`\n   ,-[a.ts:1:11]\n..."),
        // separated by blank lines, followed by a trailing summary line. Drop
        // that last line, then split the rest back into per-file blocks.
        const errorBlocks = stderr
          .slice(stderr.indexOf('\n') + 1, stderr.lastIndexOf('\n'))
          .split(/\n\s*\n/);

        for (const block of errorBlocks) {
          const match = /\[([^:]+)(?::(\d+):(\d+))?\]/.exec(block);
          const path = match?.[1];
          if (path) {
            const line = match?.[2];
            const column = match?.[3];
            const position =
              line && column
                ? { line: Number(line), column: Number(column) }
                : undefined;
            invalidPaths.push({
              path,
              message: `Oxlint errored while checking this file.\n\n${block}\n`,
              position,
            });
          }
        }
      }

      return {
        ok: false,
        execError: error.stderr !== '' ? error.stderr : undefined,
        errors: invalidPaths,
      };
    }
  }
};
