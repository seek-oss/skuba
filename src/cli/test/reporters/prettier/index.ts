import type { Reporter } from '@jest/reporters';
import fs from 'fs-extra';
import { resolveConfig } from 'prettier';

import { formatOrLintFile } from '../../../../cli/adapter/prettier';

export default class SnapshotPrettifier
  implements Pick<Reporter, 'onTestFileResult'>
{
  async onTestFileResult(
    ...[test, testResult]: Parameters<NonNullable<Reporter['onTestFileResult']>>
  ): Promise<void> {
    if (!testResult.snapshot.added && !testResult.snapshot.updated) {
      return;
    }

    const filepath = test.path;

    // This is a best-effort workaround to automatically format code.
    // Don't pollute console output if it fails for whatever reason.
    try {
      const [config, data] = await Promise.all([
        resolveConfig(filepath),
        fs.promises.readFile(filepath, 'utf-8'),
      ]);

      const formatted = await formatOrLintFile(
        {
          data,
          filepath,
          options: {
            ...config,
            filepath,
          },
        },
        'format',
        null,
      );

      if (typeof formatted === 'string') {
        await fs.promises.writeFile(filepath, formatted);
      }
    } catch {}
  }
}
