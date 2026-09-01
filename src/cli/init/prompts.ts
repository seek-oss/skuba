import {
  cancel,
  confirm,
  group,
  isCancel,
  log,
  path,
  select,
  text,
} from '@clack/prompts';

import { pathExistsSync } from '../../utils/fs.js';
import { TEMPLATE_NAMES_WITH_BYO } from '../../utils/template.js';

import { DEFAULT_RENOVATE_PRESET } from './types.js';
import {
  type Platform,
  isGitHubOrg,
  isGitHubRepo,
  isGitHubTeam,
} from './validation.js';

export interface Choice {
  name: string;
  message: string;
  initial?: string;
  validate?: (value: string) => boolean | string;
}

export interface BaseFields {
  ownerName: string;
  repoName: string;
  platformName: Platform;
  defaultBranch: string;
  renovatePreset: string;
}

export const BASE_PROMPT_DEFAULTS = {
  platformName: 'arm64',
  defaultBranch: 'main',
  renovatePreset: DEFAULT_RENOVATE_PRESET,
} as const satisfies {
  platformName: Platform;
  defaultBranch: string;
  renovatePreset: string;
};

const TEMPLATE_HINTS: Partial<
  Record<(typeof TEMPLATE_NAMES_WITH_BYO)[number], string>
> = {
  'github →': 'clone a GitHub repo',
  'seek →': 'SEEK private templates',
  'local →': 'path on disk',
};

const cancelPrompt = (): never => {
  cancel('Cancelled.');
  process.exit(0);
};

const handleCancel = <T>(value: T | symbol): T => {
  if (isCancel(value)) {
    cancelPrompt();
  }

  return value as T;
};

const toClackValidate =
  (choice: Choice) =>
  (value: string | undefined): string | undefined => {
    if (!value) {
      return 'Required';
    }

    const result = choice.validate?.(value);

    if (typeof result === 'string') {
      return result;
    }

    if (result === false) {
      return 'Required';
    }

    return undefined;
  };

export const promptBaseFields = async (): Promise<BaseFields> => {
  log.step('For starters, some project details:');

  return group(
    {
      ownerName: () =>
        text({
          message: 'Owner',
          placeholder: 'SEEK-Jobs/my-team',
          validate: (value) => {
            if (!value) {
              return 'Required';
            }

            const [org, team] = value.split('/');

            if (!org || !isGitHubOrg(org)) {
              return 'Must contain a valid GitHub org name';
            }

            if (team !== undefined && !isGitHubTeam(team)) {
              return 'Must contain a valid GitHub team name';
            }

            return undefined;
          },
        }),
      repoName: () =>
        text({
          message: 'Repo',
          placeholder: 'my-repo',
          validate: (value) => {
            if (!value) {
              return 'Required';
            }

            if (!isGitHubRepo(value)) {
              return 'Must be a valid GitHub repo name';
            }

            return pathExistsSync(value)
              ? `'${value}' is an existing directory`
              : undefined;
          },
        }),
      platformName: () =>
        select({
          message: 'Platform',
          initialValue: BASE_PROMPT_DEFAULTS.platformName,
          options: [
            { value: 'arm64', label: 'arm64' },
            { value: 'amd64', label: 'amd64' },
          ],
        }),
      defaultBranch: () =>
        text({
          message: 'Default Branch',
          placeholder: BASE_PROMPT_DEFAULTS.defaultBranch,
          defaultValue: BASE_PROMPT_DEFAULTS.defaultBranch,
        }),
      renovatePreset: () =>
        text({
          message: 'Renovate preset',
          placeholder: BASE_PROMPT_DEFAULTS.renovatePreset,
          defaultValue: BASE_PROMPT_DEFAULTS.renovatePreset,
        }),
    },
    {
      onCancel: cancelPrompt,
    },
  );
};

export const runForm = async <T = Record<string, string>>(props: {
  choices: readonly Choice[];
  message: string;
  name: string;
}): Promise<T> => {
  log.step(props.message);

  const result = await group(
    Object.fromEntries(
      props.choices.map((choice) => [
        choice.name,
        () =>
          text({
            message: choice.message,
            placeholder: choice.initial,
            validate: toClackValidate(choice),
          }),
      ]),
    ),
    {
      onCancel: cancelPrompt,
    },
  );

  return result as T;
};

export const shouldContinue = async () =>
  handleCancel(
    await confirm({
      message: 'Fill this in now?',
    }),
  );

export const getGitPath = async () =>
  handleCancel(
    await text({
      message: 'Git path',
      placeholder: 'seek-oss/skuba',
      defaultValue: 'seek-oss/skuba',
      validate: (value: string | undefined) =>
        !value || /[^/]+\/[^/]+/.test(value)
          ? undefined
          : 'Must be a valid path',
    }),
  );

export const getTemplateName = async () =>
  handleCancel(
    await select({
      message: 'Select a template:',
      options: TEMPLATE_NAMES_WITH_BYO.map((name) => ({
        label: name,
        value: name,
        hint: TEMPLATE_HINTS[name],
      })),
    }),
  );

export const getLocalTemplatePath = async () =>
  handleCancel(
    await path({
      message: 'Path to local template',
      directory: true,
      validate: (value: string | undefined) =>
        value && pathExistsSync(value) ? undefined : 'Path does not exist',
    }),
  );

export const getPrivateTemplateName = async (templates: string[]) =>
  handleCancel(
    await select({
      message: 'Select a SEEK private template:',
      options: templates.map((name) => ({ label: name, value: name })),
    }),
  );
