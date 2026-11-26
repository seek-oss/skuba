import { coerce } from 'semver';
import * as z from 'zod/v4';

import { getConsumerManifest } from './manifest.js';

const packageManagerEntrySchema = z.object({
  name: z.string(),
  version: z.string().optional(),
});

const pinSchema = z.object({
  packageManager: z.string().optional(),
  devEngines: z
    .object({
      packageManager: z
        .union([packageManagerEntrySchema, z.array(packageManagerEntrySchema)])
        .optional(),
    })
    .optional(),
});

export const getPnpmVersions = (packageJson: unknown): string[] => {
  const pin = pinSchema.safeParse(packageJson);

  if (!pin.success) {
    return [];
  }

  const { packageManager, devEngines } = pin.data;

  return [
    packageManager?.startsWith('pnpm@')
      ? packageManager.slice('pnpm@'.length)
      : undefined,
    ...[devEngines?.packageManager ?? []]
      .flat()
      .flatMap(({ name, version }) => (name === 'pnpm' ? [version] : [])),
  ].filter((version) => version !== undefined);
};

export const detectPnpmMajorVersion = async (
  cwd?: string,
): Promise<number | undefined> => {
  const manifest = await getConsumerManifest(cwd);

  if (!manifest) {
    return undefined;
  }

  for (const version of getPnpmVersions(manifest.packageJson)) {
    const coerced = coerce(version);

    if (coerced) {
      return coerced.major;
    }
  }

  return undefined;
};
