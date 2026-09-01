import { cancel, confirm, isCancel, log, select, text } from '@clack/prompts';

import { pathExistsSync } from '../../utils/fs.js';
import { TEMPLATE_NAMES_WITH_BYO } from '../../utils/template.js';

import { DEFAULT_RENOVATE_PRESET } from './types.js';
import {
  PLATFORM_OPTIONS,
  type Platform,
  isGitHubOrg,
  isGitHubRepo,
  isGitHubTeam,
  isPlatform,
} from './validation.js';

export interface Choice {
  name: string;
  message: string;
  initial?: string;
  validate?: (value: string) => boolean | string;
  /**
   * Whether the user is allowed to skip field entry and use the initial value.
   *
   * Defaults to `false`.
   */
  allowInitial?: boolean;
}

export type BaseFields = Record<
  (typeof BASE_CHOICES)[number]['name'],
  string
> & {
  platformName: Platform;
};

const BASE_CHOICES = [
  {
    name: 'ownerName',
    message: 'Owner',
    initial: 'SEEK-Jobs/my-team',
    validate: (value: unknown) => {
      if (typeof value !== 'string') {
        return 'Required';
      }

      const [org, team] = value.split('/');

      if (!org || !isGitHubOrg(org)) {
        return 'Must contain a valid GitHub org name';
      }

      return (
        team === undefined ||
        isGitHubTeam(team) ||
        'Must contain a valid GitHub team name'
      );
    },
  },
  {
    name: 'repoName',
    message: 'Repo',
    initial: 'my-repo',
    validate: (value: unknown) => {
      if (typeof value !== 'string') {
        return 'Required';
      }

      if (!isGitHubRepo(value)) {
        return 'Must be a valid GitHub repo name';
      }

      return !pathExistsSync(value) || `'${value}' is an existing directory`;
    },
  },
  {
    name: 'platformName',
    message: 'Platform',
    initial: 'arm64',
    allowInitial: true,
    validate: (value: unknown) =>
      isPlatform(value) || `Must be ${PLATFORM_OPTIONS}`,
  },
  {
    name: 'defaultBranch',
    message: 'Default Branch',
    initial: 'main',
    allowInitial: true,
    validate: (value: unknown) =>
      typeof value === 'string' && value.length > 0 ? true : 'Required',
  },
  {
    name: 'renovatePreset',
    message: 'Renovate preset',
    initial: DEFAULT_RENOVATE_PRESET,
    allowInitial: true,
    validate: (value: unknown) =>
      typeof value === 'string' && value.length > 0 ? true : 'Required',
  },
] as const;

export const BASE_PROMPT_PROPS = {
  choices: BASE_CHOICES,
  message: 'For starters, some project details:',
  name: 'baseAnswers',
};

const handleCancel = <T>(value: T | symbol): T => {
  if (isCancel(value)) {
    cancel('Cancelled.');
    process.exit(0);
  }

  return value;
};

const toClackValidate =
  (choice: Choice) =>
  (value: string | undefined): string | undefined => {
    if (!value || (value === choice.initial && !choice.allowInitial)) {
      return 'Form is not complete';
    }

    const result = choice.validate?.(value);

    if (typeof result === 'string') {
      return result;
    }

    if (result === false) {
      return 'Form is not complete';
    }

    return undefined;
  };

export const runForm = async <T = Record<string, string>>(props: {
  choices: readonly Choice[];
  message: string;
  name: string;
}): Promise<T> => {
  log.step(props.message);

  const result: Record<string, string> = {};

  for (const choice of props.choices) {
    result[choice.name] = handleCancel(
      await text({
        message: choice.message,
        placeholder: choice.initial,
        initialValue: choice.allowInitial ? choice.initial : undefined,
        validate: toClackValidate(choice),
      }),
    );
  }

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
      initialValue: 'seek-oss/skuba',
      validate: (value: string | undefined) =>
        value && /[^/]+\/[^/]+/.test(value)
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
      })),
    }),
  );

export const getLocalTemplatePath = async () =>
  handleCancel(
    await text({
      message: 'Path to local template',
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
