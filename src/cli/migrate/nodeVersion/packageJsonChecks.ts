import findUp from 'find-up';
import fs from 'fs-extra';
import { satisfies } from 'semver';
import { type ZodRawShape, z } from 'zod';

import { log } from '../../../utils/logging';

const getParentPackageJson = async () => {
  const packageJsonPath = await findUp('package.json', { cwd: process.cwd() });
  if (!packageJsonPath) {
    throw new Error('package.json not found');
  }
  return fs.readFile(packageJsonPath, 'utf-8');
};

export const extractFromParentPackageJson = async <T extends ZodRawShape>(
  schema: z.ZodObject<T>,
): Promise<z.infer<typeof schema> | undefined> => {
  const packageJson = await getParentPackageJson();
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

export const isPatchableSkubaType = async () => {
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
