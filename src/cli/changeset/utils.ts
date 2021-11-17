// Adapted from https://github.com/changesets/action/blob/21240c3cd1d2efa2672d64e0235a03cf139b83e6/src/gitUtils.ts

import type { Package } from '@manypkg/get-packages';
import { getPackages } from '@manypkg/get-packages';
import execa from 'execa';
import mdastToString from 'mdast-util-to-string';
import remarkParse from 'remark-parse';
import remarkStringify from 'remark-stringify';
import { unified } from 'unified';

export const BumpLevels = {
  dep: 0,
  patch: 1,
  minor: 2,
  major: 3,
} as const;

export async function getVersionsByDirectory(cwd: string) {
  const { packages } = await getPackages(cwd);
  return new Map(packages.map((x) => [x.dir, x.packageJson.version]));
}

export async function getChangedPackages(
  cwd: string,
  previousVersions: Map<string, string>,
) {
  const { packages } = await getPackages(cwd);
  const changedPackages = new Set<Package>();

  for (const pkg of packages) {
    const previousVersion = previousVersions.get(pkg.dir);
    if (previousVersion !== pkg.packageJson.version) {
      changedPackages.add(pkg);
    }
  }

  return [...changedPackages];
}

export function getChangelogEntry(changelog: string, version: string) {
  const ast = unified().use(remarkParse).parse(changelog);

  let highestLevel: number = BumpLevels.dep;

  const nodes = ast.children;
  let headingStartInfo:
    | {
        index: number;
        depth: number;
      }
    | undefined;
  let endIndex: number | undefined;

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    if (node.type === 'heading') {
      const stringified: string = mdastToString(node);
      const match = /(major|minor|patch)/.exec(stringified.toLowerCase());
      if (match !== null) {
        const level = BumpLevels[match[0] as 'major' | 'minor' | 'patch'];
        highestLevel = Math.max(level, highestLevel);
      }
      if (headingStartInfo === undefined && stringified === version) {
        headingStartInfo = {
          index: i,
          depth: node.depth,
        };
        continue;
      }
      if (
        endIndex === undefined &&
        headingStartInfo !== undefined &&
        headingStartInfo.depth === node.depth
      ) {
        endIndex = i;
        break;
      }
    }
  }
  if (headingStartInfo) {
    ast.children = ast.children.slice(headingStartInfo.index + 1, endIndex);
  }
  return {
    content: unified().use(remarkStringify).stringify(ast),
    highestLevel,
  };
}

export const execWithOutput = async (
  command: string,
  args?: string[],
  options: { ignoreReturnCode?: boolean; cwd?: string } = {},
) => {
  try {
    const { exitCode, stdout, stderr } = await execa(
      command,
      args,
      ...(options.cwd ? [{ cwd: options.cwd }] : []),
    );

    return {
      code: exitCode,
      stdout,
      stderr,
    };
  } catch ({ exitCode, stdout, stderr }) {
    if (!options.ignoreReturnCode) {
      throw new Error(stderr as string);
    }

    return {
      code: exitCode,
      stdout,
      stderr,
    };
  }
};

export function sortTheThings(
  a: { private: boolean; highestLevel: number },
  b: { private: boolean; highestLevel: number },
) {
  if (a.private === b.private) {
    return b.highestLevel - a.highestLevel;
  }
  if (a.private) {
    return 1;
  }
  return -1;
}
