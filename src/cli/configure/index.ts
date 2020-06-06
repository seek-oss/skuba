import path from 'path';

import chalk from 'chalk';
import { Confirm, Input } from 'enquirer';
import fs from 'fs-extra';

import { ensureCommands, exec } from '../../utils/exec';
import { showLogo } from '../../utils/logo';
import { ensureTemplateConfigDeletion } from '../../utils/template';
import { isObjectWithProp } from '../../utils/validation';
import { copyTemplate } from '../init/copyTemplates';
import { getTemplateConfig, runForm } from '../init/getConfig';

import { tsFileExists } from './analysis/files';
import { auditWorkingTree } from './analysis/git';
import { getDestinationManifest } from './analysis/package';
import { diffFiles } from './analysis/project';
import { formatObject } from './processing/json';

const CONFIRMATION_PROMPT = new Confirm({
  message: 'Apply changes?',
  name: 'confirmation',
});

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

  const entryPointPrompt = new Input({
    initial: 'src/app.ts',
    message: 'Entry point:',
    name: 'entryPoint',
    result: (value) => (value.endsWith('.ts') ? value : `${value}.ts`),
    validate: async (value) => {
      const exists = await tsFileExists(path.join(destinationRoot, value));

      return exists || `${chalk.bold(value)} is not a TypeScript file.`;
    },
  });

  const templateConfig = getTemplateConfig(destinationRoot);

  const manifestConfig =
    isObjectWithProp(manifest.packageJson, 'skuba') &&
    isObjectWithProp(manifest.packageJson.skuba, 'template') &&
    typeof manifest.packageJson.skuba.template === 'string' &&
    isObjectWithProp(manifest.packageJson.skuba, 'entryPoint') &&
    typeof manifest.packageJson.skuba.entryPoint === 'string'
      ? {
          entryPoint: manifest.packageJson.skuba.entryPoint,
          template: manifest.packageJson.skuba.template,
        }
      : undefined;

  if (templateConfig.fields.length > 0) {
    const templateName = manifestConfig?.template ?? 'template';

    const templateData = await runForm({
      choices: templateConfig.fields,
      message: chalk.bold(`Complete ${chalk.cyan(templateName)}:`),
      name: 'customAnswers',
    });

    const updatedPackageJson = formatObject(manifest.packageJson);
    const packageJsonFilepath = path.join(destinationRoot, 'package.json');
    await fs.writeFile(packageJsonFilepath, updatedPackageJson);

    await copyTemplate(destinationRoot, destinationRoot, templateData);

    await ensureTemplateConfigDeletion(destinationRoot);

    console.log(chalk.green('Finished templating.'));
  }

  const entryPoint =
    manifestConfig?.entryPoint ??
    templateConfig.entryPoint ??
    (await entryPointPrompt.run());

  console.log();
  console.log('Analysing project...');
  console.log();

  const files = await diffFiles({
    destinationRoot,
    entryPoint,
  });

  if (Object.keys(files).length === 0) {
    return console.log(chalk.green('Project already configured.'));
  }

  Object.entries(files)
    .sort(([filenameA], [filenameB]) => filenameA.localeCompare(filenameB))
    .forEach(([filename, { operation }]) =>
      console.log(`${operation} ${filename}`),
    );

  console.log();

  const shouldContinue = await CONFIRMATION_PROMPT.run();

  if (!shouldContinue) {
    return;
  }

  const dirnames = [
    ...new Set(Object.keys(files).map((filename) => path.dirname(filename))),
  ];

  await Promise.all(dirnames.map((dirname) => fs.ensureDir(dirname)));

  await Promise.all(
    Object.entries(files).map(([filename, { data }]) =>
      typeof data === 'undefined'
        ? fs.remove(filename)
        : fs.writeFile(filename, data),
    ),
  );

  await exec('yarn', 'install', '--ignore-optional', '--silent');

  console.log();
  console.log(chalk.green('Project configured!'));
  console.log();
  console.log(`Try running ${chalk.bold('skuba format')}.`);
};
