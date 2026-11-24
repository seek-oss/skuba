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

/**
 * Matches a `RUN` instruction that only enables and installs pnpm via the
 * Corepack bundled with Node.js, optionally bind mounting `package.json`.
 */
const corepackInstallRegex = () =>
  new RegExp(
    String.raw`^(?<indent>[ \t]*)RUN(?:${SEPARATOR}--mount=type=bind,\S*\bpackage\.json\b\S*)*${SEPARATOR}corepack enable(?:[ \t]+pnpm)?[ \t]+&&[ \t]+corepack install[ \t]*$`,
    'gm',
  );

export const patchDockerfileCorepack = (
  contents: string,
  corepackVersion: string,
) =>
  contents.replace(
    corepackInstallRegex(),
    (_match, indent: string) =>
      `${indent}RUN npm i -g corepack@${corepackVersion}`,
  );

/**
 * Installs Corepack from npm in Dockerfiles, as Node.js 25+ no longer bundles
 * it.
 */
export const upgradeDockerfileCorepack = async (
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
