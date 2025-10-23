import readPkgUp, { type NormalizedPackageJson } from 'read-pkg-up';
import * as z from 'zod/v4';

import { hasProp } from './validation.js';

export type ProjectType = z.infer<typeof projectTypeSchema>;

export const projectTypeSchema = z.union([
  z.literal('application'),
  z.literal('package'),
]);

export const PROJECT_TYPES = ['application', 'package'] as const;

const DEFAULT_ENTRY_POINT = 'src/app.ts';

let skubaManifest: NormalizedPackageJson | undefined;

export const getSkubaManifest = async (): Promise<NormalizedPackageJson> => {
  if (skubaManifest !== undefined) {
    return skubaManifest;
  }

  const result = await readPkgUp({ cwd: import.meta.dirname });

  if (result === undefined) {
    throw Error('skuba could not find its own manifest');
  }

  return (skubaManifest = result.packageJson);
};

export const getConsumerManifest = (cwd?: string) =>
  readPkgUp({ cwd, normalize: false });

export const getManifestProperties = async <T extends string, V = unknown>(
  prop: T,
): Promise<
  | {
      value: V | undefined;
      type: string | undefined;
      path: string;
    }
  | undefined
> => {
  const manifest = await getConsumerManifest();

  if (!manifest) {
    return undefined;
  }

  const value = hasProp<T, V>(manifest.packageJson.skuba, prop)
    ? manifest.packageJson.skuba[prop]
    : undefined;

  const type =
    typeof manifest.packageJson.type === 'string'
      ? manifest.packageJson.type
      : undefined;

  return {
    value,
    type,
    path: manifest.path,
  };
};

export const getStringPropFromConsumerManifest = async <T extends string>(
  prop: T,
): Promise<string | undefined> => {
  const manifest = await getManifestProperties(prop);

  return typeof manifest?.value === 'string' ? manifest.value : undefined;
};

export const getEntryPointFromManifest = async (): Promise<string> => {
  const entryPoint = await getStringPropFromConsumerManifest('entryPoint');

  return entryPoint ?? DEFAULT_ENTRY_POINT;
};
