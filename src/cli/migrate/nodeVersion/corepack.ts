import { join } from 'path';

import fs from 'fs-extra';

import { globFiles } from '../../../utils/glob.js';

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

const corepackInstallRegex = () =>
  new RegExp(
    String.raw`^(?<indent>[ \t]*)RUN(?:${SEPARATOR}--mount=type=bind,\S*\bpackage\.json\b\S*)*${SEPARATOR}corepack enable(?:[ \t]+pnpm)?[ \t]+&&[ \t]+corepack install[ \t]*$`,
    'gm',
  );

const COREPACK_DEFAULT_TO_LATEST_REGEX =
  /^[ \t]*ENV[ \t]+COREPACK_DEFAULT_TO_LATEST(?:=|[ \t]+)0[ \t]*\r?$/;

const NPM_INSTALL_COREPACK_REGEX =
  /^(?<indent>[ \t]*)RUN[ \t]+npm[ \t]+(?:i|install)(?=.*[ \t](?:-g|--global)\b)(?:[ \t]+(?:-g|--global|corepack(?:@\S+)?))+[ \t]*(?<eol>\r?)$/;

const FROM_REGEX = /^[ \t]*FROM[ \t]/;

const isBlank = (line: string | undefined) => !line?.trim();

export const patchDockerfileCorepack = (
  contents: string,
  corepackVersion: string,
) => {
  const install = `RUN npm i -g corepack@${corepackVersion}`;

  const lines = contents
    .replace(
      corepackInstallRegex(),
      (_match, indent: string) => `${indent}${install}`,
    )
    .split('\n');

  const result: string[] = [];
  let installed = false;
  let skipBlank = false;

  for (const line of lines) {
    if (skipBlank && isBlank(line)) {
      skipBlank = false;
      continue;
    }
    skipBlank = false;

    if (FROM_REGEX.test(line)) {
      installed = false;
    }

    const isInstall = NPM_INSTALL_COREPACK_REGEX.test(line);

    if (
      COREPACK_DEFAULT_TO_LATEST_REGEX.test(line) ||
      (isInstall && installed)
    ) {
      skipBlank = isBlank(result.at(-1));
      continue;
    }

    if (isInstall) {
      installed = true;
      result.push(
        line.replace(NPM_INSTALL_COREPACK_REGEX, `$<indent>${install}$<eol>`),
      );
      continue;
    }

    result.push(line);
  }

  return result.join('\n');
};

export const migrateDockerfileCorepack = async (
  dir: string,
  corepackVersion: string,
) => {
  const paths = new Set(
    await globFiles(DOCKERFILES, {
      cwd: dir,
      exclude: ['**/node_modules/**'],
    }),
  );

  await Promise.all(
    [...paths].map(async (filePath) => {
      const fullPath = join(dir, filePath);
      const contents = await fs.promises.readFile(fullPath, 'utf8');

      const patched = patchDockerfileCorepack(contents, corepackVersion);

      if (patched !== contents) {
        await fs.promises.writeFile(fullPath, patched);
      }
    }),
  );
};
