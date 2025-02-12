import findUp from 'find-up';
import fs from 'fs-extra';

import { log } from '../../../utils/logging';

const getParentPackageJson = async () => {
  const packageJsonPath = await findUp('package.json', { cwd: process.cwd() });
  if (!packageJsonPath) {
    throw new Error('package.json not found');
  }
  return fs.readFile(packageJsonPath);
};

const isTypeError = (error: unknown): error is TypeError =>
  error instanceof TypeError &&
  error.message.includes('Cannot read properties of undefined');

const isSyntaxError = (error: unknown): error is SyntaxError =>
  error instanceof SyntaxError && error.message.includes('Unexpected token');

export const validServerlessVersion = async (): Promise<boolean> => {
  const packageJson = await getParentPackageJson();

  try {
    const serverlessVersion = (
      JSON.parse(packageJson.toString()) as {
        devDependencies: Record<string, string>;
      }
    ).devDependencies.serverless;
    if (!serverlessVersion) {
      return true;
    }

    if (!serverlessVersion.startsWith('4')) {
      log.warn(
        'Serverless version not supported, please upgrade to 4.x to automatically update serverless files',
      );
      return false;
    }
  } catch (error) {
    if (isTypeError(error) || isSyntaxError(error)) {
      return true;
    }
    throw error;
  }
  return true;
};

export const validSkubaType = async () => {
  const packageJson = await getParentPackageJson();

  try {
    const type = (
      JSON.parse(packageJson.toString()) as {
        skuba: Record<string, string>;
      }
    ).skuba.type;
    if (!type) {
      return true;
    }

    if (type === 'package') {
      log.warn(
        'skuba type package is not supported, packages should be updated manually to ensure major runtime deprecations are intended',
      );
      return false;
    }
  } catch (error) {
    if (isTypeError(error) || isSyntaxError(error)) {
      return true;
    }
    throw error;
  }
  return true;
};
