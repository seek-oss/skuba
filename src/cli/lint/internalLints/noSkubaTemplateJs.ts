import path from 'path';

import { pathExists } from '../../../utils/fs.js';
import type { Logger } from '../../../utils/logging.js';
import { getConsumerManifest } from '../../../utils/manifest.js';
import type { InternalLintResult } from '../internal.js';

export const noSkubaTemplateJs = async (
  _mode: 'format' | 'lint',
  logger: Logger,
): Promise<InternalLintResult> => {
  const manifest = await getConsumerManifest();

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
      `Template is incomplete; run ${logger.bold('skuba init')} to resume templating. ${logger.dim('no-skuba-template-js')}`,
    );

    return {
      ok: false,
      fixable: false,
      annotations: [
        {
          path: 'skuba.template.js',
          message:
            'Template is incomplete; run `skuba init` to resume templating.',
        },
      ],
    };
  }

  return { ok: true, fixable: false };
};
