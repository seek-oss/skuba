/* eslint-disable new-cap */

import readPkgUp, { NormalizedPackageJson } from 'read-pkg-up';
import * as t from 'runtypes';

export type ProjectType = t.Static<typeof ProjectType>;

export const ProjectType = t.Union(
  t.Literal('application'),
  t.Literal('package'),
);

export const PROJECT_TYPES = ['application', 'package'] as const;

interface PackageJson extends NormalizedPackageJson {
  skuba?: {
    entryPoint?: string | null;
    template?: string | null;
    version?: string;
  };
}

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

export const getEntryPointFromManifest = async () => {
  const result = await readPkgUp();

  if (typeof result?.packageJson === 'undefined') {
    return DEFAULT_ENTRY_POINT;
  }

  return (
    (result.packageJson as PackageJson).skuba?.entryPoint ?? DEFAULT_ENTRY_POINT
  );
};
