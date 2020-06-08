import { createRequire } from 'module';
import path from 'path';

import chalk from 'chalk';

import { isObject, isObjectWithStringProp } from './validation';

const BINARY_REMAPS: Record<string, string> = {
  tsc: 'typescript',
};

const localRequire = createRequire(__filename);

const createRequireRelative = (packageName: string) => (pathname: string) => {
  const resolved = localRequire.resolve(path.join(packageName, pathname));

  return localRequire(resolved) as unknown;
};

const fail = (message: string) => {
  console.error(chalk.red(message));
  process.exit(1);
};

const getPartialBinPath = (
  packageName: string,
  binName: string,
  packageJson: unknown,
): string => {
  if (!isObject(packageJson)) {
    return fail(`${chalk.bold(`${packageName}/package.json`)} not found`);
  }

  if (typeof packageJson.bin === 'string') {
    return packageJson.bin;
  }

  if (isObjectWithStringProp(packageJson.bin, binName)) {
    return packageJson.bin[binName];
  }

  return fail(
    `${chalk.bold(`${packageName}/package.json#/bin`)} not recognised`,
  );
};

const runBinary = (packageName: string, binName: string) => {
  const requireRelative = createRequireRelative(packageName);

  // Derive the binary path from package.json#/bin.
  const packageJson = requireRelative('package.json');
  const partialBinPath = getPartialBinPath(packageName, binName, packageJson);

  // Require the binary.
  return requireRelative(partialBinPath);
};

// Hide shim argument from binary.
const [binName] = process.argv.splice(2, 1);

const packageName = BINARY_REMAPS[binName] || binName;

runBinary(packageName, binName);
