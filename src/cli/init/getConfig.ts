import path from 'path';

import chalk from 'chalk';
import { Form, FormChoice } from 'enquirer';
import fs from 'fs-extra';

import { copyFiles } from '../../utils/copy';
import { isErrorWithCode } from '../../utils/error';
import { log } from '../../utils/logging';
import {
  TEMPLATE_CONFIG_FILENAME,
  TEMPLATE_DIR,
  TemplateConfig,
} from '../../utils/template';

import { downloadGitHubTemplate } from './git';
import {
  BASE_PROMPT,
  GIT_PATH_PROMPT,
  SHOULD_CONTINUE_PROMPT,
  TEMPLATE_PROMPT,
} from './prompts';
import { InitConfig, InitConfigInput } from './types';

export const runForm = <T = Record<string, string>>(props: {
  choices: Readonly<FormChoice[]>;
  message: string;
  name: string;
}) => {
  const { message, name } = props;

  const choices = props.choices.map((choice) => ({
    ...choice,
    validate: (value: string) => {
      if (value === '' || value === choice.initial) {
        return 'Form is not complete';
      }

      return choice.validate?.(value) ?? true;
    },
  }));

  const form = new Form<T>({
    choices,
    message,
    name,
    validate: async (values) => {
      const results = await Promise.all(
        choices.map((choice) => choice.validate(values[choice.name])),
      );

      return (
        results.find((result) => typeof result === 'string') ??
        results.every((result) => result === true)
      );
    },
  });

  return form.run();
};

const confirmShouldContinue = async (choices: Readonly<FormChoice[]>) => {
  const fieldsList = choices.map((choice) => choice.message);

  log.newline();
  log.plain('This template uses the following information:');
  log.newline();
  fieldsList.forEach((message) => log.subtle(`- ${message}`));

  log.newline();
  const result = await SHOULD_CONTINUE_PROMPT.run();

  return result === 'yes';
};

const createDirectory = async (dir: string) => {
  try {
    await fs.mkdir(dir);
  } catch (err: unknown) {
    if (isErrorWithCode(err, 'EEXIST')) {
      log.err(`The directory '${dir}' already exists.`);
      process.exit(1);
    }

    throw err;
  }
};

const cloneTemplate = async (templateName: string, destinationDir: string) => {
  if (templateName.startsWith('github:')) {
    const gitHubPath = templateName.slice('github:'.length);
    return downloadGitHubTemplate(gitHubPath, destinationDir);
  }

  const templateDir = path.join(TEMPLATE_DIR, templateName);

  await copyFiles({
    // assume built-in templates have no extraneous files
    include: () => true,
    sourceRoot: templateDir,
    destinationRoot: destinationDir,
    processors: [],
    // built-in templates have files like _package.json
    stripUnderscorePrefix: true,
  });
};

const getTemplateName = async () => {
  const templateSelection = await TEMPLATE_PROMPT.run();

  if (templateSelection === 'github →') {
    const gitHubPath = await GIT_PATH_PROMPT.run();
    return `github:${gitHubPath}`;
  }

  return templateSelection;
};

const generatePlaceholders = (choices: FormChoice[]) =>
  Object.fromEntries(
    choices.map(({ name }) => [name, `<%- ${name} %>`] as const),
  );

export const getTemplateConfig = (dir: string): TemplateConfig => {
  const templateConfigPath = path.join(dir, TEMPLATE_CONFIG_FILENAME);

  try {
    /* eslint-disable-next-line @typescript-eslint/no-var-requires */
    const templateConfig = require(templateConfigPath) as unknown;

    return TemplateConfig.check(templateConfig);
  } catch (err: unknown) {
    if (isErrorWithCode(err, 'MODULE_NOT_FOUND')) {
      return {
        entryPoint: undefined,
        fields: [],
        type: undefined,
      };
    }

    throw err;
  }
};

export const configureFromPrompt = async (): Promise<InitConfig> => {
  const { values: baseAnswers } = await BASE_PROMPT.run();
  log.plain(
    chalk.cyan(baseAnswers.repoName),
    'by',
    chalk.cyan(baseAnswers.teamName),
    'in',
    chalk.cyan(baseAnswers.orgName),
  );

  const destinationDir = baseAnswers.repoName;

  await createDirectory(destinationDir);

  log.newline();
  const templateName = await getTemplateName();

  await cloneTemplate(templateName, destinationDir);

  const { entryPoint, fields, noSkip, type } = getTemplateConfig(
    path.join(process.cwd(), destinationDir),
  );

  if (fields.length === 0) {
    return {
      destinationDir,
      entryPoint,
      templateComplete: true,
      templateData: baseAnswers,
      templateName,
      type,
    };
  }

  const shouldContinue = noSkip ? true : await confirmShouldContinue(fields);

  if (shouldContinue) {
    log.newline();
    const customAnswers = await runForm({
      choices: fields,
      message: chalk.bold(`Complete ${chalk.cyan(templateName)}:`),
      name: 'customAnswers',
    });

    return {
      destinationDir,
      entryPoint,
      templateComplete: true,
      templateData: { ...baseAnswers, ...customAnswers },
      templateName,
      type,
    };
  }

  log.newline();
  log.warn(`Resume this later with ${chalk.bold('pnpm skuba configure')}.`);

  const customAnswers = generatePlaceholders(fields);

  return {
    destinationDir,
    entryPoint,
    templateComplete: false,
    templateData: { ...baseAnswers, ...customAnswers },
    templateName,
    type,
  };
};

const configureFromPipe = async (): Promise<InitConfig> => {
  let text = '';

  await new Promise((resolve) =>
    process.stdin.on('data', (chunk) => (text += chunk)).once('end', resolve),
  );

  text = text.trim();

  if (text === '') {
    log.err('No data from stdin.');
    process.exit(1);
  }

  let value: unknown;

  try {
    value = JSON.parse(text) as unknown;
  } catch {
    log.err('Invalid JSON from stdin.');
    process.exit(1);
  }

  const result = InitConfigInput.validate(value);

  if (!result.success) {
    log.err('Invalid data from stdin:');
    log.err(
      typeof result.key === 'undefined'
        ? result.message
        : `${result.key}: ${result.message}`,
    );
    process.exit(1);
  }

  const {
    destinationDir,
    templateComplete,
    templateData,
    templateName,
  } = result.value;

  await createDirectory(destinationDir);

  await cloneTemplate(templateName, destinationDir);

  const { entryPoint, fields, noSkip, type } = getTemplateConfig(
    path.join(process.cwd(), destinationDir),
  );

  if (!templateComplete) {
    if (noSkip) {
      log.err('Templating for', log.bold(templateName), 'cannot be skipped.');
      process.exit(1);
    }

    return {
      ...result.value,
      entryPoint,
      templateData: {
        ...templateData,
        ...generatePlaceholders(fields),
      },
      type,
    };
  }

  const required = fields.map(({ name }) => name);

  const provided = new Set(Object.keys(templateData));

  const missing = required.filter((name) => !provided.has(name));

  if (missing.length > 0) {
    log.err('This template uses the following information:');
    log.newline();
    missing.forEach((name) => log.err(`- ${name}`));
    process.exit(1);
  }

  return {
    ...result.value,
    entryPoint,
    type,
  };
};

export const getConfig = () =>
  process.stdin.isTTY ? configureFromPrompt() : configureFromPipe();
