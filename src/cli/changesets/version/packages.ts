import type { Package } from '@manypkg/get-packages';
import { getPackages } from '@manypkg/get-packages';

export type PackageVersions = Record<string, string>;

export const getPackageVersions = async (
  cwd: string,
): Promise<PackageVersions> => {
  const { packages } = await getPackages(cwd);
  return Object.fromEntries(
    packages.map((pkg) => [pkg.dir, pkg.packageJson.version]),
  );
};

export const getChangedPackages = async (
  cwd: string,
  previousVersions: PackageVersions,
) => {
  const { packages } = await getPackages(cwd);
  const changedPackages = new Set<Package>();

  for (const pkg of packages) {
    if (previousVersions[pkg.dir] !== pkg.packageJson.version) {
      changedPackages.add(pkg);
    }
  }

  return [...changedPackages];
};
