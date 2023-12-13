import { inspect } from 'util';

import { detect } from 'detect-package-manager';
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
    exec: 'pnpm exec',
    install: 'pnpm install',
    runSilent: 'pnpm --silent run',
    update: isInstalledGlobally ? 'pnpm update --global' : 'pnpm update',
  },
  yarn: {
    exec: 'yarn',
    install: 'yarn install',
    runSilent: 'yarn -s',
    update: isInstalledGlobally ? 'yarn global upgrade' : 'yarn upgrade',
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
    const raw = await detect({ cwd, includeGlobalBun: false });

    packageManager = packageManagerSchema.parse(raw);
  } catch (err) {
    log.warn(
      `Failed to detect package manager; defaulting to ${log.bold(
        DEFAULT_PACKAGE_MANAGER,
      )}.`,
    );
    log.subtle(inspect(err));
  }

  return configForPackageManager(packageManager);
};

export type PackageManager = z.infer<typeof packageManagerSchema>;

export const packageManagerSchema = z
  .union([z.literal('pnpm'), z.literal('yarn')])
  .default(DEFAULT_PACKAGE_MANAGER);
