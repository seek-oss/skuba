import path from 'path';

import { pathExists } from 'fs-extra';

import { loadSkubaConfig } from '../../../config/load';
import type { Logger } from '../../../utils/logging';
import { detectPackageManager } from '../../../utils/packageManager';
import type { InternalLintResult } from '../internal';

export const noSkubaTemplateJs = async (
  _mode: 'format' | 'lint',
  logger: Logger,
): Promise<InternalLintResult> => {
  const [{ configPath }, packageManager] = await Promise.all([
    loadSkubaConfig(),
    detectPackageManager(),
  ]);

  if (!configPath) {
    // This will throw elsewhere
    return { ok: true, fixable: false };
  }

  const templateConfigPath = path.join(
    path.dirname(configPath),
    'skuba.template.js',
  );

  if (await pathExists(templateConfigPath)) {
    logger.err(
      `Template is incomplete; run ${logger.bold(
        packageManager.print.exec,
        'skuba',
        'configure',
      )}. ${logger.dim('no-skuba-template-js')}`,
    );

    return {
      ok: false,
      fixable: false,
      annotations: [
        {
          path: 'skuba.template.js',
          message: `Template is incomplete; run ${packageManager.print.exec} skuba configure.`,
        },
      ],
    };
  }

  return { ok: true, fixable: false };
};
