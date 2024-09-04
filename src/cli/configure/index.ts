import path from 'path';

import { Select } from 'enquirer';

import { createInclusionFilter } from '../../utils/copy';
import { createExec, ensureCommands } from '../../utils/exec';
import { log } from '../../utils/logging';
import { showLogo } from '../../utils/logo';
import { BASE_TEMPLATE_DIR } from '../../utils/template';
import { hasProp } from '../../utils/validation';

import { analyseConfiguration } from './analyseConfiguration';
import { analyseDependencies } from './analyseDependencies';
import { auditWorkingTree } from './analysis/git';
import { getDestinationManifest } from './analysis/package';
import { ensureTemplateCompletion } from './ensureTemplateCompletion';
import { getEntryPoint } from './getEntryPoint';
import { getProjectType } from './getProjectType';

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
    ensureCommands('git', 'pnpm'),
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

  const type = await getProjectType({
    manifest,
    templateConfig,
  });

  const entryPoint = await getEntryPoint({
    destinationRoot,
    manifest,
    templateConfig,
    type,
  });

  const fixDependencies = await analyseDependencies({
    destinationRoot,
    include,
    manifest,
    type,
  });

  if (fixDependencies) {
    log.newline();

    if (await shouldApply('fixDependencies')) {
      await fixDependencies();
    }
  }

  const firstRun = hasProp(manifest.packageJson, 'skuba');

  const fixConfiguration = await analyseConfiguration({
    destinationRoot,
    entryPoint,
    firstRun,
    type,
  });

  if (fixConfiguration) {
    log.newline();

    if (await shouldApply('fixConfiguration')) {
      await fixConfiguration();
    }
  }

  if (fixDependencies) {
    const exec = createExec({
      stdio: 'pipe',
      streamStdio: 'pnpm',
    });

    log.plain('Installing dependencies...');
    await exec('pnpm', 'install', '--reporter=silent');
  }

  if (fixConfiguration || fixDependencies) {
    log.newline();
    log.ok(`Try running ${log.bold('pnpm format')}.`);
  }
};
