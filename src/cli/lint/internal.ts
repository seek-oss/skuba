import path from 'path';

import chalk from 'chalk';

import { pathExists } from '../../utils/dir';
import { log } from '../../utils/logging';
import { getConsumerManifest } from '../../utils/manifest';

const noSkubaTemplateJs = async () => {
  const manifest = await getConsumerManifest();

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
        'yarn skuba configure',
      )}. ${chalk.dim('no-skuba-template-js')}`,
    );

    process.exitCode = 1;
  }
};

export const internalLint = async () => {
  await noSkubaTemplateJs();
};
