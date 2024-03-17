import path from 'path';

import { pathExists } from 'fs-extra';

import type { Logger } from '../../../utils/logging';
import { getConsumerManifest } from '../../../utils/manifest';
import { detectPackageManager } from '../../../utils/packageManager';
import type { InternalLintResult } from '../internal';

export const noSkubaTemplateJs = async (
  _mode: 'format' | 'lint',
  logger: Logger,
): Promise<InternalLintResult> => {
  const [manifest, packageManager] = await Promise.all([
    getConsumerManifest(),
    detectPackageManager(),
  ]);

  if (!manifest) {
    // This will throw elsewhere
    return { ok: true, fixable: false };
  }

  const templateConfigPath = path.join(
    path.dirname(manifest.path),
    'skuba.template.js',
  );

  if (await pathExists(templateConfigPath)) {
    logger.err(
      `Template is incomplete; run ${logger.bold(
        packageManager.exec,
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
          message: `Template is incomplete; run ${packageManager.exec} skuba configure.`,
        },
      ],
    };
  }

  return { ok: true, fixable: false };
};
