import path from 'path';

import { Select } from 'enquirer';

import { createInclusionFilter } from '../../utils/copy';
import { ensureCommands, exec } from '../../utils/exec';
import { log } from '../../utils/logging';
import { showLogo } from '../../utils/logo';
import { BASE_TEMPLATE_DIR } from '../../utils/template';

import { analyseConfiguration } from './analyseConfiguration';
import { analyseDependencies } from './analyseDependencies';
import { auditWorkingTree } from './analysis/git';
import { getDestinationManifest } from './analysis/package';
import { ensureTemplateCompletion } from './ensureTemplateCompletion';
import { getEntryPoint } from './getEntryPoint';

const shouldApply = async (name: string) => {
  const prompt = new Select({
    choices: ['yes', 'no'] as const,
    message: 'Apply changes?',
    name,
  });

  const result = await prompt.run();

  return result === 'yes';
};

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

  const fixDependencies = await analyseDependencies({
    destinationRoot,
    include,
    manifest,
  });

  if (fixDependencies) {
    log.newline();

    if (await shouldApply('fixDependencies')) {
      await fixDependencies();
    }
  }

  const fixConfiguration = await analyseConfiguration({
    destinationRoot,
    entryPoint,
  });

  if (fixConfiguration) {
    log.newline();

    if (await shouldApply('fixConfiguration')) {
      await fixConfiguration();
    }
  }

  if (fixConfiguration || fixDependencies) {
    await exec('yarn', 'install', '--silent');

    log.newline();
    log.ok(`Try running ${log.bold('skuba format')}.`);
  }
};
