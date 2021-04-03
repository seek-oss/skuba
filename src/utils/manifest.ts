/* eslint-disable new-cap */

import readPkgUp, { NormalizedPackageJson } from 'read-pkg-up';
import * as t from 'runtypes';

import { dirname } from './esm.js'
import { hasProp, hasStringProp } from './validation.js';

const __dirname = dirname(import.meta);

export type ProjectType = t.Static<typeof ProjectType>;

export const ProjectType = t.Union(
  t.Literal('application'),
  t.Literal('package'),
);

export const PROJECT_TYPES = ['application', 'package'] as const;

const DEFAULT_ENTRY_POINT = 'src/app.ts';

let skubaManifest: NormalizedPackageJson | undefined;

export const getSkubaManifest = async (): Promise<NormalizedPackageJson> => {
  if (typeof skubaManifest !== 'undefined') {
    return skubaManifest;
  }

  const result = await readPkgUp({ cwd: __dirname });

  if (typeof result === 'undefined') {
    throw Error('skuba could not find its own manifest');
  }

  return (skubaManifest = result.packageJson);
};

export const getConsumerManifest = () => readPkgUp();

export const getEntryPointFromManifest = async () => {
  const result = await getConsumerManifest();

  return typeof result !== 'undefined' &&
    hasStringProp(result.packageJson.skuba, 'entryPoint')
    ? result.packageJson.skuba.entryPoint
    : DEFAULT_ENTRY_POINT;
};

export const isBabelFromManifest = async () => {
  const result = await getConsumerManifest();

  return (
    typeof result !== 'undefined' &&
    hasProp(result.packageJson.skuba, 'babel') &&
    Boolean(result.packageJson.skuba.babel)
  );
};
