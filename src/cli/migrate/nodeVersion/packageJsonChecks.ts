import findUp from 'find-up';
import fs from 'fs-extra';

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

export const checkServerlessVersion = async () => {
  const packageJson = await getParentPackageJson();

  try {
    const serverlessVersion = (
      JSON.parse(packageJson.toString()) as {
        devDependencies: Record<string, string>;
      }
    ).devDependencies.serverless;
    if (!serverlessVersion) {
      return;
    }

    if (!serverlessVersion.startsWith('4')) {
      throw new Error(
        'Serverless version not supported, please upgrade to 4.x',
      );
    }
  } catch (error) {
    if (isTypeError(error) || isSyntaxError(error)) {
      return;
    }
    throw error;
  }
};

export const checkSkubaType = async () => {
  const packageJson = await getParentPackageJson();

  try {
    const type = (
      JSON.parse(packageJson.toString()) as {
        skuba: Record<string, string>;
      }
    ).skuba.type;
    if (!type) {
      return;
    }

    if (type === 'package') {
      throw new Error(
        'Skuba type package is not supported, packages should be updated manually to ensure major runtime depreciations are intended',
      );
    }
  } catch (error) {
    if (isTypeError(error) || isSyntaxError(error)) {
      return;
    }
    throw error;
  }
};
