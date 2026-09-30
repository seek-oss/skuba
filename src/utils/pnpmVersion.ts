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

export const detectPnpmMajorVersion = async (
  cwd?: string,
): Promise<number | undefined> => {
  const manifest = await getConsumerManifest(cwd);

  if (!manifest) {
    return undefined;
  }

  const pin = pinSchema.safeParse(manifest.packageJson);

  if (!pin.success) {
    return undefined;
  }

  const { packageManager, devEngines } = pin.data;

  const versions = [
    packageManager?.startsWith('pnpm@')
      ? packageManager.slice('pnpm@'.length)
      : undefined,
    ...[devEngines?.packageManager ?? []]
      .flat()
      .flatMap(({ name, version }) => (name === 'pnpm' ? [version] : [])),
  ];

  for (const version of versions) {
    const coerced = coerce(version);

    if (coerced) {
      return coerced.major;
    }
  }

  return undefined;
};
