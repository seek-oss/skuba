#!/usr/bin/env node
import path from 'node:path';
import process from 'node:process';
import { styleText } from 'node:util';

import { detectSameFileSpyUsage } from './index.js';

const dir = path.resolve(process.argv[2] ?? process.cwd());
const warnings = await detectSameFileSpyUsage(dir);

if (warnings.length === 0) {
  process.exit(0);
}

for (const {
  testFile,
  importSpecifier,
  resolvedFile,
  spiedFunction,
  reason,
} of warnings) {
  const rel = path.relative(process.cwd(), testFile);
  const src = path.relative(process.cwd(), resolvedFile);

  const reasonMessage =
    reason === 'direct-import-in-test'
      ? `${styleText('bold', `'${spiedFunction}'`)} is also directly imported in the test file — the direct import bypasses the spy`
      : `${styleText('bold', `'${spiedFunction}'`)} is called internally — the spy won't intercept it`;

  // eslint-disable-next-line no-console
  console.error(
    [
      '',
      `  ${styleText(['bold', 'red'], 'Invalid spy')} in ${styleText('cyan', rel)}`,
      `  ${styleText('dim', 'spy:')}     ${styleText('yellow', `(jest|vi).spyOn(…, '${spiedFunction}')`)}`,
      `  ${styleText('dim', 'module:')}  ${styleText('cyan', src)} (via ${styleText('bold', `'${importSpecifier}'`)})`,
      `  ${styleText('dim', 'reason:')}  ${reasonMessage}`,
    ].join('\n'),
  );
}

// eslint-disable-next-line no-console
console.error('');
process.exit(1);
