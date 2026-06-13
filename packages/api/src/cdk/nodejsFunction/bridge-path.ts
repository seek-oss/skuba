import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

import { ValidationError } from './errors.js';

const findPackageRoot = (moduleUrl: string): string => {
  let dir = path.dirname(fileURLToPath(moduleUrl));
  for (;;) {
    if (fs.existsSync(path.join(dir, 'package.json'))) {
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) {
      throw new ValidationError(
        'Unable to locate the package root to resolve the bundler bridge script.',
      );
    }
    dir = parent;
  }
};

export const BRIDGE_OUTPUT_SEGMENTS = [
  'lib',
  'cdk',
  'bridges',
  'rolldown.mjs',
] as const;

let bridgePath: string | undefined;

export const resolveRolldownBridge = (): string =>
  (bridgePath ??= path.join(
    findPackageRoot(import.meta.url),
    ...BRIDGE_OUTPUT_SEGMENTS,
  ));
