import { Input, Select, Snippet } from 'enquirer';
import fs from 'fs-extra';

import { isGitHubOrg, isGitHubRepo, isGitHubTeam } from './validation';

type BaseFields = Record<typeof BASE_CHOICES[number]['name'], string>;

const BASE_CHOICES = [
  {
    name: 'orgName',
    message: 'org',
    initial: 'SEEK-Jobs',
    validate: (value: unknown) => {
      if (typeof value !== 'string') {
        return 'required';
      }

      return isGitHubOrg(value) || 'fails GitHub validation';
    },
  },
  {
    name: 'repoName',
    message: 'repo',
    validate: async (value: unknown) => {
      if (typeof value !== 'string') {
        return 'required';
      }

      if (!isGitHubRepo(value)) {
        return 'fails GitHub validation';
      }

      const exists = await fs.pathExists(value);

      return !exists || `'${value}' is an existing directory`;
    },
  },
  {
    name: 'teamName',
    message: 'team',
    validate: (value: unknown) => {
      if (typeof value !== 'string') {
        return 'required';
      }

      return isGitHubTeam(value) || 'fails GitHub validation';
    },
  },
] as const;

export const BASE_PROMPT = new Snippet<BaseFields>({
  fields: BASE_CHOICES,
  message: 'For starters:',
  name: 'baseAnswers',
  required: true,
  template: [
    'https://github.com/${orgName}/${repoName}',
    'https://github.com/orgs/${orgName}/teams/${teamName}',
  ].join('\n'),
});

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
  choices: [
    'greeter',
    'koa-rest-api',
    'express-rest-api',
    'lambda-sqs-worker',
    'oss-npm-package',
    'private-npm-package',
    'github →',
  ] as const,
  message: 'Select a template:',
  name: 'templateName',
});
