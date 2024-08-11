import readPkgUp from 'read-pkg-up';

import { log } from '../../../utils/logging';
import type { DependencyDiff, DependencySet } from '../types';

import { determineOperation } from './diff';

interface GetDestinationManifestProps {
  cwd?: string;
}

export const getDestinationManifest = async (
  props?: GetDestinationManifestProps,
) => {
  const result = await readPkgUp(props);

  if (result === undefined) {
    log.err(
      'Could not find a',
      log.bold('package.json'),
      'in your working directory.',
    );
    process.exit(1);
  }

  return result;
};

const joinVersions = (a: string | undefined, b: string | undefined) =>
  [a, b].filter((v) => v !== undefined).join(' -> ');

interface DiffDependenciesProps {
  old: Record<string, string | undefined>;
  new: Record<string, string | undefined>;
}

export const diffDependencies = (
  props: DiffDependenciesProps,
): DependencyDiff => {
  const deletionsAndModifications = Object.fromEntries(
    Object.entries(props.old).flatMap(([name, oldVersion]) => {
      if (oldVersion === props.new[name] || oldVersion === undefined) {
        return [];
      }

      const newVersion = props.new[name];

      const operation = determineOperation(oldVersion, newVersion);
      const version = joinVersions(oldVersion, newVersion);

      return [[name, { operation, version }]] as const;
    }),
  );

  const additions = Object.fromEntries(
    Object.entries(props.new).flatMap(([name, version]) => {
      if (name in props.old || version === undefined) {
        return [];
      }

      const oldVersion = props.old[name];

      const operation = determineOperation(oldVersion, version);

      return [[name, { operation, version }]] as const;
    }),
  );

  return {
    ...deletionsAndModifications,
    ...additions,
  };
};
