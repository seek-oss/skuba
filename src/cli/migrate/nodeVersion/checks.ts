import findUp from 'find-up';
import fs from 'fs-extra';
import { coerce, lt, satisfies } from 'semver';
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
    log.subtle('Serverless version not found, assuming it is not a dependency');
    return true;
  }

  if (!satisfies(serverlessVersion, '4.x.x')) {
    log.warn(
      'Serverless version not supported, please upgrade to 4.x to automatically update serverless files',
    );
    return false;
  }

  log.ok('Serverless version is supported, proceeding with migration');
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
      "skuba type couldn't be found, please specify the type of project in the package.json, to ensure the correct migration is applied",
    );
    return false;
  }
  if (type === 'package') {
    log.warn(
      'skuba type package is not supported, packages should be updated manually to ensure major runtime deprecations are intended',
    );
    return false;
  }

  log.ok('skuba type supported, proceeding with migration');
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
    lt(coercedCurrentVersion, coercedTargetVersion);

  if (!isNodeVersionValid) {
    log.warn(
      `Node version in .nvmrc is higher than the target version ${coercedTargetVersion}, please ensure the target version is greater than the current version ${coercedCurrentVersion}`,
    );
    return false;
  }

  log.ok('Valid node version found, proceeding with migration');
  return true;
};
