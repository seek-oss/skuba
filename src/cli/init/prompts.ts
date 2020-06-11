import { Input, Select } from 'enquirer';
import fs from 'fs-extra';

export type BaseFields = Record<typeof BASE_CHOICES[number]['name'], string>;

export const BASE_CHOICES = [
  {
    name: 'repoName',
    message: 'Repository',
    initial: 'prefix-my-project',
    validate: async (value: string) => {
      const exists = await fs.pathExists(value);

      return !exists || `'${value}' is an existing directory`;
    },
  },
  {
    name: 'orgName',
    message: 'Github org name',
    initial: 'my-org',
  },
  {
    name: 'teamName',
    message: 'GitHub team',
    initial: 'my-team',
  },
] as const;

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
    'lambda-sqs-worker',
    'private-npm-package',
    'github →',
  ] as const,
  message: 'Select a template:',
  name: 'templateName',
});
