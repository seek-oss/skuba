import isInstalledGlobally from 'is-installed-globally';

/**
 * The command used to upgrade a globally- or locally-installed package.
 *
 * skuba manages pnpm projects exclusively.
 */
export const pnpmUpdate = isInstalledGlobally
  ? 'pnpm update --global'
  : 'pnpm update';
