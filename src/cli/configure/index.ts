import path from 'path';

import { ensureCommands } from '../../utils/exec';
import { log } from '../../utils/logging';
import { showLogo } from '../../utils/logo';

import { auditWorkingTree } from './analysis/git';
import { getDestinationManifest } from './analysis/package';
import { diffFiles } from './analysis/project';
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

  await auditWorkingTree();

  const templateConfig = await ensureTemplateCompletion({
    destinationRoot,
    manifest,
  });

  const entryPoint = await getEntryPoint({
    destinationRoot,
    manifest,
    templateConfig,
  });

  log.newline();
  log.plain('Analysing project...');

  const files = await diffFiles({
    destinationRoot,
    entryPoint,
  });

  return applyConfiguration({ files });
};
