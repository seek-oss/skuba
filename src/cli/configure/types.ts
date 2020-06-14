export { PackageJson, TsConfigJson } from 'type-fest';

export interface DependencySet {
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
}

export type DependencyDiff = Record<
  string,
  { operation: string; version: string }
>;

type FileProcessor = (
  file: string | undefined,
  files: Files,
  initialFiles: Readonly<Files>,
) => string | undefined;

export type FileDiff = Record<
  string,
  { data: string | undefined; operation: string }
>;

export type Files = Record<string, string | undefined>;

export type Module = Record<string, FileProcessor>;

export interface Options {
  destinationRoot: string;
  entryPoint: string;
}
