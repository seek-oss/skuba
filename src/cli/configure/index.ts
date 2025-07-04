import path from 'path';

import { Select } from 'enquirer';

import { createInclusionFilter } from '../../utils/dir.js';
import { createExec, ensureCommands } from '../../utils/exec.js';
import { log } from '../../utils/logging.js';
import { showLogoAndVersionInfo } from '../../utils/logo.js';
import { detectPackageManager } from '../../utils/packageManager.js';
import { BASE_TEMPLATE_DIR } from '../../utils/template.js';
import { hasProp } from '../../utils/validation.js';

import { analyseConfiguration } from './analyseConfiguration.js';
import { analyseDependencies } from './analyseDependencies.js';
import { auditWorkingTree } from './analysis/git.js';
import { getDestinationManifest } from './analysis/package.js';
import { ensureTemplateCompletion } from './ensureTemplateCompletion.js';
import { getEntryPoint } from './getEntryPoint.js';
import { getProjectType } from './getProjectType.js';

const shouldApply = async (name: string) => {
  if (!process.stdin.isTTY) {
    return 'yes';
  }
  const prompt = new Select({
    choices: ['yes', 'no'] as const,
    message: 'Apply changes?',
    name,
  });

  const result = await prompt.run();

  return result === 'yes';
};

export const configure = async () => {
  await showLogoAndVersionInfo();

  const [manifest, packageManager] = await Promise.all([
    getDestinationManifest(),
    detectPackageManager(),
  ]);

  await ensureCommands(packageManager.command);

  const destinationRoot = path.dirname(manifest.path);

  log.plain('Detected project root:', log.bold(destinationRoot));

  const [include] = await Promise.all([
    createInclusionFilter([
      path.join(destinationRoot, '.gitignore'),
      path.join(BASE_TEMPLATE_DIR, '_.gitignore'),
    ]),

    auditWorkingTree(destinationRoot),
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
    packageManager,
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
      streamStdio: packageManager.command,
    });

    log.newline();
    try {
      await exec(packageManager.command, 'install');
    } catch {
      log.newline();
      log.warn(log.bold('✗ Failed to install dependencies. Resume with:'));

      log.newline();
      log.plain(log.bold(packageManager.command, 'install'));
      log.plain(log.bold(packageManager.command, 'format'));

      log.newline();
      process.exitCode = 1;
      return;
    }
  }

  if (fixConfiguration ?? fixDependencies) {
    log.newline();
    log.ok(log.bold('✔ All done! Try running:'));

    log.newline();
    log.plain(log.bold(packageManager.command, 'format'));
  }

  log.newline();
};
