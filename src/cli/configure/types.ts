import type { PackageJson as TypeFestPackageJson } from 'type-fest';

import type { ProjectType } from '../../utils/manifest.js';
import type { PackageManagerConfig } from '../../utils/packageManager.js';

export type { TsConfigJson } from 'type-fest';

export type PackageJson = TypeFestPackageJson & Record<string, unknown>;

export interface DependencySet {
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  type: ProjectType;
}

export type DependencyDiff = Record<
  string,
  { operation: string; version: string }
>;

type FileProcessor = (
  file: string | undefined,
  files: Files,
  initialFiles: Readonly<Files>,
) => Promise<string | undefined> | string | undefined;

export type FileDiff = Record<
  string,
  { data: string | undefined; operation: string }
>;

export type Files = Record<string, string | undefined>;

export type Module = Record<string, FileProcessor>;

export interface Options {
  destinationRoot: string;
  entryPoint: string;
  firstRun: boolean;
  packageManager: PackageManagerConfig;
  type: ProjectType;
}
