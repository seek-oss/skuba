import path from 'path';

import fs from 'fs-extra';
import { valid } from 'semver';

import { isErrorWithCode } from '../../../utils/error.js';
import { globFiles } from '../../../utils/glob.js';
import { log } from '../../../utils/logging.js';
import { getPnpmVersions } from '../../../utils/pnpmVersion.js';

const DOCKERFILES = [
  '**/Dockerfile*',
  '**/dockerfile*',
  '**/*.Dockerfile',
  '**/*.dockerfile',
];

/**
 * Matches whitespace between arguments, including line continuations.
 */
const SEPARATOR = String.raw`(?:[ \t]*\\\r?\n[ \t]*|[ \t]+)`;

const corepackEnableRegex = () =>
  new RegExp(
    String.raw`^(?<indent>[ \t]*)RUN(?:${SEPARATOR}--mount=type=bind,\S*\bpackage\.json\b\S*)*${SEPARATOR}corepack enable(?:[ \t]+pnpm)?(?:[ \t]+&&[ \t]+corepack install)?[ \t]*$`,
    'gm',
  );

const COREPACK_DEFAULT_TO_LATEST_REGEX =
  /^[ \t]*ENV[ \t]+COREPACK_DEFAULT_TO_LATEST(?:=|[ \t]+)0[ \t]*\r?$/;

const NPM_INSTALL_COREPACK_REGEX =
  /^[ \t]*RUN[ \t]+npm[ \t]+(?:i|install)(?=.*[ \t](?:-g|--global)\b)(?:[ \t]+(?:-g|--global|corepack(?:@\S+)?))+[ \t]*\r?$/;

const isBlank = (line: string | undefined) => !line?.trim();

const isRemovable = (line: string) =>
  COREPACK_DEFAULT_TO_LATEST_REGEX.test(line) ||
  NPM_INSTALL_COREPACK_REGEX.test(line);

export const patchDockerfileCorepack = (
  contents: string,
  pnpmVersion: string,
) => {
  const result: string[] = [];
  let skipBlank = false;

  for (const line of contents.split('\n')) {
    if (skipBlank && isBlank(line)) {
      skipBlank = false;
      continue;
    }
    skipBlank = false;

    if (isRemovable(line)) {
      skipBlank = isBlank(result.at(-1));
      continue;
    }

    result.push(line);
  }

  return result
    .join('\n')
    .replace(
      corepackEnableRegex(),
      (_match, indent: string) =>
        `${indent}RUN npm install --global pnpm@${pnpmVersion}`,
    );
};

const readPnpmVersion = async (packageJsonPath: string) => {
  let contents: string;
  try {
    contents = await fs.promises.readFile(packageJsonPath, 'utf8');
  } catch (err) {
    if (isErrorWithCode(err, 'ENOENT')) {
      return;
    }
    throw err;
  }

  let packageJson: unknown;
  try {
    packageJson = JSON.parse(contents);
  } catch {
    return;
  }

  return getPnpmVersions(packageJson)
    .map((version) => version.split('+')[0])
    .find((version) => version && valid(version));
};

/**
 * Resolves the exact pnpm version from the nearest `package.json` at or above
 * the Dockerfile, stopping at `dir`.
 */
const findPnpmVersion = async (dir: string, filePath: string) => {
  const relativeDir = path.dirname(filePath);
  const segments = relativeDir === '.' ? [] : relativeDir.split(path.sep);

  for (let index = segments.length; index >= 0; index--) {
    const version = await readPnpmVersion(
      path.join(dir, ...segments.slice(0, index), 'package.json'),
    );

    if (version) {
      return version;
    }
  }

  return;
};

export const migrateDockerfileCorepack = async (dir: string) => {
  const paths = new Set(
    await globFiles(DOCKERFILES, {
      cwd: dir,
      exclude: ['**/node_modules/**'],
    }),
  );

  await Promise.all(
    [...paths].map(async (filePath) => {
      const fullPath = path.join(dir, filePath);
      const contents = await fs.promises.readFile(fullPath, 'utf8');

      if (!/corepack/i.test(contents)) {
        return;
      }

      const pnpmVersion = await findPnpmVersion(dir, filePath);

      if (!pnpmVersion) {
        log.warn(
          `Unable to find an exact pnpm version in package.json for ${filePath}; leaving its Corepack usage as is`,
        );
        return;
      }

      const patched = patchDockerfileCorepack(contents, pnpmVersion);

      if (patched !== contents) {
        await fs.promises.writeFile(fullPath, patched);
      }
    }),
  );
};
