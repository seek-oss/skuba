import path from 'path';

import { input } from '@inquirer/prompts';
import { styleText } from 'node:util';
import fs from 'fs-extra';

import { copyFiles } from '../../utils/copy.js';
import { isErrorWithCode } from '../../utils/error.js';
import { log } from '../../utils/logging.js';
import {
  DEFAULT_PACKAGE_MANAGER,
  configForPackageManager,
} from '../../utils/packageManager.js';
import { getRandomPort } from '../../utils/port.js';
import {
  TEMPLATE_CONFIG_FILENAME,
  TEMPLATE_DIR,
  type TemplateConfig,
  templateConfigSchema,
} from '../../utils/template.js';

import { downloadGitHubTemplate } from './git.js';
import {
  BASE_PROMPT_PROPS,
  type BaseFields,
  type Choice,
  getGitPath,
  getTemplateName,
  shouldContinue,
} from './prompts.js';
import { type InitConfig, initConfigInputSchema } from './types.js';

export const runForm = async <T = Record<string, string>>(props: {
  choices: readonly Choice[];
  message: string;
  name: string;
}): Promise<T> => {
  const { message } = props;
  log.plain(message);

  const result: Record<string, string> = {};

  for (const choice of props.choices) {
    const inputValue = await input({
      message: choice.message,
      default: choice.initial,
      validate: async (inputText: string) => {
        if (
          !inputText ||
          inputText === '' ||
          (inputText === choice.initial && !choice.allowInitial)
        ) {
          return 'Form is not complete';
        }

        return choice.validate?.(inputText) ?? true;
      },
    });

    result[choice.name] = inputValue;
  }

  return result as T;
};

const confirmShouldContinue = async (choices: readonly Choice[]) => {
  const fieldsList = choices.map((choice) => choice.message);

  log.newline();
  log.plain('This template uses the following information:');
  log.newline();
  fieldsList.forEach((message) => log.subtle(`- ${message}`));

  log.newline();
  const result = await shouldContinue();

  return result === 'yes';
};

const createDirectory = async (dir: string) => {
  try {
    await fs.promises.mkdir(dir);
  } catch (err) {
    if (isErrorWithCode(err, 'EEXIST')) {
      log.err(`The directory '${dir}' already exists.`);
      process.exit(1);
    }

    throw err;
  }
};

const cloneTemplate = async (
  templateName: string,
  destinationDir: string,
): Promise<TemplateConfig> => {
  const isCustomTemplate = templateName.startsWith('github:');

  if (isCustomTemplate) {
    const gitHubPath = templateName.slice('github:'.length);

    await downloadGitHubTemplate(gitHubPath, destinationDir);
  } else {
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
  }

  const templateConfig = getTemplateConfig(
    path.join(process.cwd(), destinationDir),
  );

  if (isCustomTemplate) {
    log.newline();
    log.warn(
      'You may need to run',
      log.bold(
        `${configForPackageManager(templateConfig.packageManager).print.exec} skuba configure`,
      ),
      'once this is done.',
    );
  }

  return templateConfig;
};

const selectTemplateName = async () => {
  const templateSelection = await getTemplateName();

  if (templateSelection === 'github →') {
    const gitHubPath = await getGitPath();
    return `github:${gitHubPath}`;
  }

  return templateSelection;
};

const generatePlaceholders = (choices: Choice[]) =>
  Object.fromEntries(
    choices.map(({ name }) => [name, `<%- ${name} %>`] as const),
  );

export const getTemplateConfig = (dir: string): TemplateConfig => {
  const templateConfigPath = path.join(dir, TEMPLATE_CONFIG_FILENAME);

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const templateConfig = require(templateConfigPath) as unknown;

    return templateConfigSchema.parse(templateConfig);
  } catch (err) {
    if (isErrorWithCode(err, 'MODULE_NOT_FOUND')) {
      return {
        entryPoint: undefined,
        fields: [],
        packageManager: DEFAULT_PACKAGE_MANAGER,
        type: undefined,
      };
    }

    throw err;
  }
};

const baseToTemplateData = async ({
  ownerName,
  platformName,
  repoName,
  defaultBranch,
}: BaseFields) => {
  const [orgName, teamName] = ownerName.split('/');

  const port = String(await getRandomPort());

  if (!orgName) {
    throw new Error(`Invalid format for owner name: ${ownerName}`);
  }

  return {
    orgName,
    ownerName,
    repoName,
    defaultBranch,
    // Use standalone username in `teamName` contexts
    teamName: teamName ?? orgName,

    port,

    platformName,
    lambdaCdkArchitecture: platformName === 'amd64' ? 'X86_64' : 'ARM_64',
    lambdaServerlessArchitecture:
      platformName === 'amd64' ? 'x86_64' : platformName,
  };
};

export const configureFromPrompt = async (): Promise<InitConfig> => {
  const { ownerName, platformName, repoName, defaultBranch } =
    await runForm<BaseFields>(BASE_PROMPT_PROPS);
  log.plain(styleText('cyan', repoName), 'by', styleText('cyan', ownerName));

  const templateData = await baseToTemplateData({
    ownerName,
    platformName,
    repoName,
    defaultBranch,
  });

  const destinationDir = repoName;

  await createDirectory(destinationDir);

  log.newline();
  const templateName = await selectTemplateName();

  const { entryPoint, fields, noSkip, packageManager, type } =
    await cloneTemplate(templateName, destinationDir);

  if (fields.length === 0) {
    return {
      destinationDir,
      entryPoint,
      packageManager,
      templateComplete: true,
      templateData,
      templateName,
      type,
    };
  }

  const shouldContinueWithTemplate = noSkip
    ? true
    : await confirmShouldContinue(fields);

  if (shouldContinueWithTemplate) {
    log.newline();
    const customAnswers = await runForm({
      choices: fields,
      message: styleText('bold', `Complete ${styleText('cyan', templateName)}:`),
      name: 'customAnswers',
    });

    return {
      destinationDir,
      entryPoint,
      packageManager,
      templateComplete: true,
      templateData: { ...templateData, ...customAnswers },
      templateName,
      type,
    };
  }

  log.newline();
  log.warn(
    `Resume this later with ${styleText('bold', `${configForPackageManager(packageManager).print.exec} skuba configure`)}.`,
  );

  const customAnswers = generatePlaceholders(fields);

  return {
    destinationDir,
    entryPoint,
    packageManager,
    templateComplete: false,
    templateData: { ...templateData, ...customAnswers },
    templateName,
    type,
  };
};

export const readJSONFromStdIn = async () => {
  let text = '';

  await new Promise((resolve) =>
    process.stdin
      .on('data', (chunk) => (text += chunk.toString()))
      .once('end', resolve),
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

  return value;
};

const configureFromPipe = async (): Promise<InitConfig> => {
  const value = await readJSONFromStdIn();

  const result = initConfigInputSchema.safeParse(value);

  if (!result.success) {
    log.err('Invalid data from stdin:');
    log.err(result.error);
    process.exit(1);
  }

  const { destinationDir, templateComplete, templateName } = result.data;

  const templateData = {
    ...(await baseToTemplateData(result.data.templateData)),
    ...result.data.templateData,
  };

  await createDirectory(destinationDir);

  const { entryPoint, fields, noSkip, packageManager, type } =
    await cloneTemplate(templateName, destinationDir);

  if (!templateComplete) {
    if (noSkip) {
      log.err('Templating for', log.bold(templateName), 'cannot be skipped.');
      process.exit(1);
    }

    return {
      ...result.data,
      entryPoint,
      packageManager,
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
    ...result.data,
    entryPoint,
    packageManager,
    templateData,
    type,
  };
};

export const getConfig = () =>
  process.stdin.isTTY ? configureFromPrompt() : configureFromPipe();
