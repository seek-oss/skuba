/* eslint-disable new-cap */

import type { NormalizedPackageJson } from 'read-pkg-up';
import readPkgUp from 'read-pkg-up';
import * as t from 'runtypes';

import { hasProp } from './validation';

export type ProjectType = t.Static<typeof ProjectType>;

export const ProjectType = t.Union(
  t.Literal('application'),
  t.Literal('package'),
);

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

export const getConsumerManifest = () => readPkgUp();

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
