import { Input, Select, Snippet } from 'enquirer';
import fs from 'fs-extra';

type BaseFields = Record<typeof BASE_CHOICES[number]['name'], string>;

const BASE_CHOICES = [
  {
    name: 'repoName',
    message: 'repo',
    validate: async (value: unknown) => {
      if (typeof value !== 'string') {
        return 'required';
      }

      const exists = await fs.pathExists(value);

      return !exists || `'${value}' is an existing directory`;
    },
  },
  {
    name: 'orgName',
    message: 'org',
    initial: 'SEEK-Jobs',
  },
  {
    name: 'teamName',
    message: 'team',
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
    'lambda-sqs-worker',
    'private-npm-package',
    'github →',
  ] as const,
  message: 'Select a template:',
  name: 'templateName',
});
