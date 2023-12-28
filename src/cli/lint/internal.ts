import path from 'path';

import chalk from 'chalk';
import { pathExists } from 'fs-extra';

import { log } from '../../utils/logging';
import { getConsumerManifest } from '../../utils/manifest';
import { detectPackageManager } from '../../utils/packageManager';

const noSkubaTemplateJs = async () => {
  const [manifest, packageManager] = await Promise.all([
    getConsumerManifest(),
    detectPackageManager(),
  ]);

  if (!manifest) {
    return;
  }

  const templateConfigPath = path.join(
    path.dirname(manifest.path),
    'skuba.template.js',
  );

  if (await pathExists(templateConfigPath)) {
    log.err(
      `Template is incomplete; run ${chalk.bold(
        packageManager.exec,
        'skuba',
        'configure',
      )}. ${chalk.dim('no-skuba-template-js')}`,
    );

    process.exitCode = 1;
  }
};

export const internalLint = async () => {
  await noSkubaTemplateJs();
};
