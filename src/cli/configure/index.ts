import path from 'path';

import { createInclusionFilter } from '../../utils/copy';
import { ensureCommands } from '../../utils/exec';
import { log } from '../../utils/logging';
import { showLogo } from '../../utils/logo';
import { BASE_TEMPLATE_DIR } from '../../utils/template';

import { auditWorkingTree } from './analysis/git';
import { getDestinationManifest } from './analysis/package';
import { applyConfiguration } from './applyConfiguration';
import { ensureTemplateCompletion } from './ensureTemplateCompletion';
import { getEntryPoint } from './getEntryPoint';

export const configure = async () => {
  await showLogo();

  const [manifest] = await Promise.all([
    getDestinationManifest(),
    ensureCommands('git', 'yarn'),
  ]);

  const destinationRoot = path.dirname(manifest.path);

  log.plain('Detected project root:', log.bold(destinationRoot));

  const [include] = await Promise.all([
    createInclusionFilter([
      path.join(destinationRoot, '.gitignore'),
      path.join(BASE_TEMPLATE_DIR, '_.gitignore'),
    ]),

    auditWorkingTree(),
  ]);

  const templateConfig = await ensureTemplateCompletion({
    destinationRoot,
    include,
    manifest,
  });

  const entryPoint = await getEntryPoint({
    destinationRoot,
    manifest,
    templateConfig,
  });

  log.newline();
  log.plain('Analysing project...');

  return applyConfiguration({
    destinationRoot,
    entryPoint,
  });
};
