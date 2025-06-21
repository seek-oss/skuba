import { cancel, confirm, isCancel, select, text } from '@clack/prompts';
import { pathExists } from 'fs-extra';

import { TEMPLATE_NAMES_WITH_BYO } from '../../utils/template';

import {
  PLATFORM_OPTIONS,
  type Platform,
  isGitHubOrg,
  isGitHubRepo,
  isGitHubTeam,
  isPlatform,
} from './validation';

export type Choice = {
  name: string;
  message: string;
  initial?: string;
  validate?: (value: unknown) => boolean | string | Promise<boolean | string>;
  /**
   * Whether the user is allowed to skip field entry and use the initial value.
   *
   * Defaults to `false`.
   */
  allowInitial?: boolean;
};

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
        return 'required';
      }

      const [org, team] = value.split('/');

      if (!org || !isGitHubOrg(org)) {
        return 'fails GitHub validation';
      }

      return (
        team === undefined || isGitHubTeam(team) || 'fails GitHub validation'
      );
    },
  },
  {
    name: 'repoName',
    message: 'Repo',
    initial: 'my-repo',
    validate: async (value: unknown) => {
      if (typeof value !== 'string') {
        return 'required';
      }

      if (!isGitHubRepo(value)) {
        return 'fails GitHub validation';
      }

      const exists = await pathExists(value);

      return !exists || `'${value}' is an existing directory`;
    },
  },
  {
    name: 'platformName',
    message: 'Platform',
    initial: 'arm64',
    allowInitial: true,
    validate: (value: unknown) =>
      isPlatform(value) || `must be ${PLATFORM_OPTIONS}`,
  },
  {
    name: 'defaultBranch',
    message: 'Default Branch',
    initial: 'main',
    allowInitial: true,
    validate: (value: unknown) =>
      typeof value === 'string' && value.length > 0 ? true : 'required',
  },
] as const;

export const BASE_PROMPT_PROPS = {
  choices: BASE_CHOICES,
  message: 'For starters, some project details:',
  name: 'baseAnswers',
};

export const shouldContinuePrompt = async () => {
  const result = await confirm({
    message: 'Fill this in now?',
  });

  if (isCancel(result)) {
    cancel('Operation cancelled.');
    process.exit(0);
  }

  return result;
};

export const gitPathPrompt = async () => {
  const result = await text({
    message: 'Git path',
    initialValue: 'seek-oss/skuba',
    validate: (value) =>
      /[^/]+\/[^/]+/.test(value) ? undefined : 'Path is not valid',
  });

  if (isCancel(result)) {
    cancel('Operation cancelled.');
    process.exit(0);
  }

  return result;
};

export const templateNamePrompt = async () => {
  const result = await select({
    message: 'Select a template:',
    options: TEMPLATE_NAMES_WITH_BYO.map((name) => ({
      value: name,
      label: name,
    })),
  });

  if (isCancel(result)) {
    cancel('Operation cancelled.');
    process.exit(0);
  }

  return result;
};
