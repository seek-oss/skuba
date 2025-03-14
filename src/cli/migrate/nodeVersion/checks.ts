import findUp from 'find-up';
import fs from 'fs-extra';
import { coerce, lte, satisfies } from 'semver';
import { type ZodRawShape, z } from 'zod';

import { log } from '../../../utils/logging';

const getParentFile = async (file: string, cwd: string = process.cwd()) => {
  const path = await findUp(file, { cwd });
  if (!path) {
    return undefined;
  }
  return {
    fileContent: await fs.readFile(path, 'utf-8'),
    path,
  };
};

export const extractFromParentPackageJson = async <T extends ZodRawShape>(
  schema: z.ZodObject<T>,
  currentPath: string,
) => {
  const file = await getParentFile('package.json', currentPath);
  if (!file) {
    return { packageJson: undefined, packageJsonRelativePath: undefined };
  }
  const { fileContent: packageJson, path } = file;
  let rawJSON;
  try {
    rawJSON = JSON.parse(packageJson) as unknown;
  } catch {
    throw new Error(`${path} is not valid JSON`);
  }
  const result = schema.safeParse(rawJSON);
  if (!result.success) {
    return { packageJson: undefined, packageJsonRelativePath: path };
  }

  return { packageJson: result.data, packageJsonRelativePath: path };
};

export const isPatchableServerlessVersion = async (
  currentPath: string,
): Promise<boolean> => {
  const { packageJson, packageJsonRelativePath } =
    await extractFromParentPackageJson(
      z.object({
        devDependencies: z.object({
          serverless: z.string().optional(),
        }),
      }),
      currentPath,
    );
  if (!packageJson) {
    throw new Error(
      'package.json not found, ensure it is in the correct location',
    );
  }

  const serverlessVersion = packageJson?.devDependencies.serverless;

  if (!serverlessVersion) {
    log.subtle(
      `Serverless version not found in ${packageJsonRelativePath}, assuming it is not a dependency`,
    );
    return true;
  }

  if (!satisfies(serverlessVersion, '4.x.x')) {
    log.warn(
      `Serverless version ${serverlessVersion} cannot be migrated; use Serverless 4.x to automatically migrate Serverless files`,
    );
    return false;
  }

  log.ok(
    `Proceeding with migration of Serverless version ${serverlessVersion}`,
  );
  return true;
};

export const isPatchableSkubaType = async (
  currentPath: string,
): Promise<boolean> => {
  const { packageJson, packageJsonRelativePath } =
    await extractFromParentPackageJson(
      z.object({
        skuba: z.object({
          type: z.string().optional(),
        }),
        files: z.string().array().optional(),
      }),
      currentPath,
    );

  if (!packageJson) {
    throw new Error(
      'package.json not found, ensure it is in the correct location',
    );
  }

  if (packageJson.files) {
    log.warn(
      'Migrations are not supported for packages; update manually to ensure major runtime deprecations are intended',
    );
    return false;
  }

  const type = packageJson?.skuba.type;

  if (!type) {
    log.warn(
      `skuba project type not found in ${packageJsonRelativePath}; add a package.json#/skuba/type to ensure the correct migration can be applied`,
    );
    return false;
  }
  if (type === 'package') {
    log.warn(
      'Migrations are not supported for packages; update manually to ensure major runtime deprecations are intended',
    );
    return false;
  }

  log.ok(`Proceeding with migration of skuba project type ${type}`);
  return true;
};

export const isPatchableNodeVersion = async (
  targetNodeVersion: number,
  currentPath: string,
): Promise<boolean> => {
  const nvmrcFile = await getParentFile('.nvmrc');
  const nodeVersionFile = await getParentFile('.node-version');
  const { packageJson } = await extractFromParentPackageJson(
    z.object({
      engines: z.object({
        node: z.string(),
      }),
    }),
    currentPath,
  );

  const nvmrcNodeVersion = nvmrcFile?.fileContent;
  const nodeVersion = nodeVersionFile?.fileContent;
  const engineVersion = packageJson?.engines.node;

  const currentNodeVersion = nvmrcNodeVersion || nodeVersion || engineVersion;

  const coercedTargetVersion = coerce(targetNodeVersion.toString())?.version;
  const coercedCurrentVersion = coerce(currentNodeVersion)?.version;

  const isNodeVersionValid =
    coercedTargetVersion &&
    coercedCurrentVersion &&
    lte(coercedCurrentVersion, coercedTargetVersion);

  if (!isNodeVersionValid) {
    log.warn(
      `Node.js version ${coercedCurrentVersion ?? 'unknown'} cannot be migrated to ${coercedTargetVersion}`,
    );
    return false;
  }

  log.ok(
    `Proceeding with migration from Node.js ${coercedCurrentVersion} to ${coercedTargetVersion}`,
  );
  return true;
};
