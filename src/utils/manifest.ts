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

  const result = await readPkgUp({ cwd: __dirname });

  if (result === undefined) {
    throw Error('skuba could not find its own manifest');
  }

  return (skubaManifest = result.packageJson);
};

export const getConsumerManifest = (cwd?: string) => readPkgUp({ cwd });

export const getPropFromConsumerManifest = async <
  T extends string,
  V = unknown,
>(
  prop: T,
): Promise<V | undefined> => {
  const result = await getConsumerManifest();

  return result !== undefined && hasProp<T, V>(result.packageJson.skuba, prop)
    ? result.packageJson.skuba[prop]
    : undefined;
};

export const getStringPropFromConsumerManifest = async <T extends string>(
  prop: T,
): Promise<string | undefined> => {
  const result = await getPropFromConsumerManifest(prop);

  return typeof result === 'string' ? result : undefined;
};

export const getEntryPointFromManifest = async (): Promise<string> => {
  const entryPoint = await getStringPropFromConsumerManifest('entryPoint');

  return entryPoint ?? DEFAULT_ENTRY_POINT;
};
