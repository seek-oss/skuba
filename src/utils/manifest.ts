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

export const getConsumerManifest = (cwd?: string) =>
  readPkgUp({ cwd, normalize: false });

export const getManifestProperties = async <T extends string>(
  skubaProp: T,
): Promise<{
  skubaProp: string | undefined;
  type: string | undefined;
}> => {
  const result = await getConsumerManifest();

  if (result === undefined) {
    return {
      skubaProp: undefined,
      type: undefined,
    };
  }

  const skubaPropValue = hasProp<T, string>(result.packageJson.skuba, skubaProp)
    ? result.packageJson.skuba[skubaProp]
    : undefined;

  const typeValue =
    typeof result.packageJson.type === 'string'
      ? result.packageJson.type
      : undefined;

  return {
    skubaProp: skubaPropValue,
    type: typeValue,
  };
};

export const getStringPropFromConsumerManifest = async <T extends string>(
  prop: T,
): Promise<string | undefined> => {
  const { skubaProp } = await getManifestProperties(prop);

  return typeof skubaProp === 'string' ? skubaProp : undefined;
};

export const getEntryPointFromManifest = async (): Promise<string> => {
  const entryPoint = await getStringPropFromConsumerManifest('entryPoint');

  return entryPoint ?? DEFAULT_ENTRY_POINT;
};
