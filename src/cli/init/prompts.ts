import { pathExists } from 'fs-extra';

import { TEMPLATE_NAMES_WITH_BYO } from '../../utils/template';

import { isGitHubOrg, isGitHubRepo, isGitHubTeam } from './validation';

import { Input, Select } from 'enquirer';

export type BaseFields = Record<typeof BASE_CHOICES[number]['name'], string>;

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

      if (!isGitHubOrg(org)) {
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
] as const;

export const BASE_PROMPT_PROPS = {
  choices: BASE_CHOICES,
  message: 'For starters, some GitHub details:',
  name: 'baseAnswers',
};

export const SHOULD_CONTINUE_PROMPT = new Select({
  choices: ['yes', 'no'] as const,
  message: 'Fill this in now?',
  name: 'shouldContinue',
});

export const GIT_PATH_PROMPT = new Input({
  message: 'Git path',
  name: 'gitPath',
  initial: 'seek-oss/skuba',
  validate: (value) => /[^/]+\/[^/]+/.test(value) || 'Path is not valid',
});

export const TEMPLATE_PROMPT = new Select({
  choices: TEMPLATE_NAMES_WITH_BYO,
  message: 'Select a template:',
  name: 'templateName',
});
