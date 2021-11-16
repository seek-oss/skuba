/* eslint-disable new-cap */

import type { NormalizedPackageJson } from 'read-pkg-up';
import readPkgUp from 'read-pkg-up';
import * as t from 'runtypes';

import { hasStringProp } from './validation';

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

export const getEntryPointFromManifest = async () => {
  const result = await getConsumerManifest();

  return result !== undefined &&
    hasStringProp(result.packageJson.skuba, 'entryPoint')
    ? result.packageJson.skuba.entryPoint
    : DEFAULT_ENTRY_POINT;
};
