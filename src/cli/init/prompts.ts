import { input, select } from '@inquirer/prompts';

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

export interface Choice {
  name: string;
  message: string;
  initial?: string;
  validate?: (value: string) => boolean | string | Promise<boolean | string>;
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
    validate: async (value: unknown) => {
      if (typeof value !== 'string') {
        return 'Required';
      }

      if (!isGitHubRepo(value)) {
        return 'Must be a valid GitHub repo name';
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
] as const;

export const BASE_PROMPT_PROPS = {
  choices: BASE_CHOICES,
  message: 'For starters, some project details:',
  name: 'baseAnswers',
};

export const shouldContinue = async () =>
  select({
    message: 'Fill this in now?',
    choices: [
      { name: 'Yes', value: 'yes' },
      { name: 'No', value: 'no' },
    ],
  });

export const getGitPath = async () =>
  input({
    message: 'Git path',
    default: 'seek-oss/skuba',
    validate: (value: string) =>
      /[^/]+\/[^/]+/.test(value) || 'Must be a valid path',
  });

export const getTemplateName = async () =>
  select({
    message: 'Select a template:',
    choices: TEMPLATE_NAMES_WITH_BYO.map((name) => ({ name, value: name })),
  });

export const getPrivateTemplateName = async () =>
  input({
    message: 'Private template name',
    validate: (value: string) =>
      value.length > 0 || 'Must be a valid template name',
  });
