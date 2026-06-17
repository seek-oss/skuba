import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

import { ValidationError } from './errors.js';
import { findUp } from './util.js';

const findPackageRoot = (moduleUrl: string): string => {
  const start = path.dirname(fileURLToPath(moduleUrl));
  const pkg = findUp('package.json', start);
  if (!pkg) {
    throw new ValidationError(
      'Unable to locate the package root to resolve the bundler bridge script.',
    );
  }
  return path.dirname(pkg);
};

export const BRIDGE_RELATIVE_PATH = path.join(
  'lib',
  'cdk',
  'bridges',
  'rolldown.mjs',
);

export const resolveRolldownBridge = (): string =>
  path.join(findPackageRoot(import.meta.url), BRIDGE_RELATIVE_PATH);
