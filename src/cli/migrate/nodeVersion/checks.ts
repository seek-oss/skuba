import findUp from 'find-up';
import fs from 'fs-extra';
import { coerce, lte, satisfies } from 'semver';
import { type ZodRawShape, z } from 'zod';

import { log } from '../../../utils/logging';

const getParentFile = async (file: string) => {
  const path = await findUp(file, { cwd: process.cwd() });
  if (!path) {
    throw new Error(`${file} not found`);
  }
  return fs.readFile(path, 'utf-8');
};

export const extractFromParentPackageJson = async <T extends ZodRawShape>(
  schema: z.ZodObject<T>,
): Promise<z.infer<typeof schema> | undefined> => {
  const packageJson = await getParentFile('package.json');
  let rawJSON;
  try {
    rawJSON = JSON.parse(packageJson) as unknown;
  } catch {
    throw new Error('package.json is not valid JSON');
  }
  const result = schema.safeParse(rawJSON);
  if (!result.success) {
    return undefined;
  }

  return result.data;
};

export const isPatchableServerlessVersion = async (): Promise<boolean> => {
  const serverlessVersion = (
    await extractFromParentPackageJson(
      z.object({
        devDependencies: z.object({
          serverless: z.string(),
        }),
      }),
    )
  )?.devDependencies.serverless;

  if (!serverlessVersion) {
    log.subtle(`Serverless version not found in ${packageJsonRelativePath}, assuming it is not a dependency`);
    return true;
  }

  if (!satisfies(serverlessVersion, '4.x.x')) {
    log.warn(
      `Serverless version ${serverlessVersion} cannot be migrated; use Serverless 4.x to automatically migrate Serverless files',
    );
    return false;
  }

  log.ok(`Proceeding with migration of Serverless version ${serverlessVersion}`);
  return true;
};

export const isPatchableSkubaType = async (): Promise<boolean> => {
  const type = (
    await extractFromParentPackageJson(
      z.object({
        skuba: z.object({
          type: z.string(),
        }),
      }),
    )
  )?.skuba.type;

  if (!type) {
    log.warn(
      "skuba project type not found in ${packageJsonRelativePath}`; add a package.json#/skuba/type to ensure the correct migration can be applied",
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
): Promise<boolean> => {
  const currentNodeVersion = await getParentFile('.nvmrc');

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

  log.ok(`Proceeding with migration from Node.js ${coercedCurrentVersion} to ${coercedTargetVersion}`);
  return true;
};
