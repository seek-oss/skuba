import path from 'path';

import chalk from 'chalk';

import { ensureCommands } from '../../utils/exec';
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

  console.log(`Detected project root: ${chalk.bold(destinationRoot)}`);
  console.log();

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

  console.log();
  console.log('Analysing project...');
  console.log();

  const files = await diffFiles({
    destinationRoot,
    entryPoint,
  });

  return applyConfiguration({ files });
};
