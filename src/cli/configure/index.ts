import path from 'path';

import { cancel, isCancel, select } from '@clack/prompts';

import { createInclusionFilter } from '../../utils/dir';
import { createExec, ensureCommands } from '../../utils/exec';
import { log } from '../../utils/logging';
import { showLogoAndVersionInfo } from '../../utils/logo';
import { detectPackageManager } from '../../utils/packageManager';
import { BASE_TEMPLATE_DIR } from '../../utils/template';
import { hasProp } from '../../utils/validation';

import { analyseConfiguration } from './analyseConfiguration';
import { analyseDependencies } from './analyseDependencies';
import { auditWorkingTree } from './analysis/git';
import { getDestinationManifest } from './analysis/package';
import { ensureTemplateCompletion } from './ensureTemplateCompletion';
import { getEntryPoint } from './getEntryPoint';
import { getProjectType } from './getProjectType';

const shouldApply = async () => {
  if (!process.stdin.isTTY) {
    return true;
  }

  const result = await select({
    message: 'Apply changes?',
    options: [
      { value: 'yes', label: 'yes' },
      { value: 'no', label: 'no' },
    ],
  });

  if (isCancel(result)) {
    cancel('Operation cancelled.');
    process.exit(0);
  }

  return String(result) === 'yes';
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

    if (await shouldApply()) {
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

    if (await shouldApply()) {
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
