import findUp from 'find-up';
import isInstalledGlobally from 'is-installed-globally';
import { z } from 'zod';

import { log } from './logging';

// TODO: consider changing to this to `pnpm` in a future major version.
export const DEFAULT_PACKAGE_MANAGER = 'yarn';

export type PackageManagerConfig =
  (typeof PACKAGE_MANAGERS)[keyof typeof PACKAGE_MANAGERS] & {
    command: PackageManager;
  };

const PACKAGE_MANAGERS = {
  pnpm: {
    print: {
      exec: 'pnpm exec',
      runSilent: 'pnpm --silent run',
      update: isInstalledGlobally ? 'pnpm update --global' : 'pnpm update',
    },
  },
  yarn: {
    print: {
      exec: 'yarn',
      runSilent: 'yarn -s',
      update: isInstalledGlobally ? 'yarn global upgrade' : 'yarn upgrade',
    },
  },
};

export const configForPackageManager = (
  packageManager: PackageManager,
): PackageManagerConfig => ({
  ...PACKAGE_MANAGERS[packageManager],
  command: packageManager,
});

export const detectPackageManager = async (
  cwd?: string,
): Promise<PackageManagerConfig> => {
  let packageManager: PackageManager = DEFAULT_PACKAGE_MANAGER;

  try {
    const [yarnDepth, pnpmDepth] = await Promise.all([
      findDepth('yarn.lock', cwd),
      findDepth('pnpm-lock.yaml', cwd),
    ]);

    if (yarnDepth === undefined && pnpmDepth === undefined) {
      throw new Error('No package manager lockfile found.');
    }

    packageManager = (pnpmDepth ?? -1) > (yarnDepth ?? -1) ? 'pnpm' : 'yarn';
  } catch (err) {
    log.warn(
      `Failed to detect package manager; defaulting to ${log.bold(
        DEFAULT_PACKAGE_MANAGER,
      )}.`,
    );
    log.subtle(
      (() => {
        switch (true) {
          case err instanceof Error:
            return err.message;

          default:
            return String(err);
        }
      })(),
    );
  }

  return configForPackageManager(packageManager);
};

const findDepth = async (filename: string, cwd?: string) => {
  const path = await findUp(filename, { cwd });
  return path ? path.split('/').length : undefined;
};

export type PackageManager = z.infer<typeof packageManagerSchema>;

export const packageManagerSchema = z
  .enum(['pnpm', 'yarn'])
  .default(DEFAULT_PACKAGE_MANAGER);
