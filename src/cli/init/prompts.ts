import enquirer, { type FormChoice } from 'enquirer';

import { pathExists } from '../../utils/fs.js';
import { TEMPLATE_NAMES_WITH_BYO } from '../../utils/template.js';

import {
  PLATFORM_OPTIONS,
  type Platform,
  isGitHubOrg,
  isGitHubRepo,
  isGitHubTeam,
  isPlatform,
} from './validation.js';

export type Choice = FormChoice & {
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

export const SHOULD_CONTINUE_PROMPT = new enquirer.Select({
  choices: ['yes', 'no'] as const,
  message: 'Fill this in now?',
  name: 'shouldContinue',
});

export const GIT_PATH_PROMPT = new enquirer.Input({
  message: 'Git path',
  name: 'gitPath',
  initial: 'seek-oss/skuba',
  validate: (value) => /[^/]+\/[^/]+/.test(value) || 'Path is not valid',
});

export const TEMPLATE_PROMPT = new enquirer.Select({
  choices: TEMPLATE_NAMES_WITH_BYO,
  message: 'Select a template:',
  name: 'templateName',
});
