import nodePath from 'path';

import {
  type CANCEL_SYMBOL,
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

import type { ExistingRepoDefaults } from './existingRepo.js';
import { DEFAULT_RENOVATE_PRESET } from './types.js';
import {
  type Platform,
  isGitHubOrg,
  isGitHubRepo,
  isGitHubTeam,
  isProjectName,
} from './validation.js';

export interface Choice {
  name: string;
  message: string;
  initial?: string;
  /** Pre-filled answer that the user can edit, as opposed to a hint. */
  initialValue?: string;
  validate?: (value: string) => boolean | string;
}

export interface BaseFields {
  ownerName: string;
  repoName: string;
  /**
   * Name of the project itself, which doubles as its package name.
   *
   * This matches `repoName` for a standalone repository, but diverges in a
   * workspace where the repository hosts multiple projects.
   */
  projectName: string;
  platformName: Platform;
  defaultBranch: string;
  renovatePreset: string;
}

export interface PromptedProject extends BaseFields {
  /** Directory to scaffold into, relative to the current working directory. */
  destinationDir: string;
}

export const BASE_PROMPT_DEFAULTS = {
  platformName: 'arm64',
  defaultBranch: 'main',
  renovatePreset: DEFAULT_RENOVATE_PRESET,
} as const satisfies Pick<
  BaseFields,
  'platformName' | 'defaultBranch' | 'renovatePreset'
>;

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

const handleCancel = <T>(value: T | typeof CANCEL_SYMBOL): T => {
  if (isCancel(value)) {
    return cancelPrompt();
  }

  return value;
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

const validateOwnerName = (value: string | undefined) => {
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
};

const validateRepoName = (value: string | undefined) => {
  if (!value) {
    return 'Required';
  }

  return isGitHubRepo(value) ? undefined : 'Must be a valid GitHub repo name';
};

const validateProjectDir = (
  workspaceRoot: string,
  value: string | undefined,
) => {
  if (!value) {
    return 'Required';
  }

  const relative = nodePath.relative(
    workspaceRoot,
    nodePath.resolve(workspaceRoot, value),
  );

  if (!relative || relative.startsWith('..')) {
    return 'Must be a directory inside the workspace root';
  }

  return pathExistsSync(nodePath.join(workspaceRoot, relative))
    ? `'${relative.split(nodePath.sep).join('/')}' is an existing directory`
    : undefined;
};

const platformPrompt = () =>
  select({
    message: 'Platform',
    initialValue: BASE_PROMPT_DEFAULTS.platformName,
    options: [
      { value: 'arm64', label: 'arm64' },
      { value: 'amd64', label: 'amd64' },
    ],
  });

const defaultBranchPrompt = () =>
  text({
    message: 'Default Branch',
    placeholder: BASE_PROMPT_DEFAULTS.defaultBranch,
    defaultValue: BASE_PROMPT_DEFAULTS.defaultBranch,
  });

const promptStandaloneFields = async (): Promise<PromptedProject> => {
  log.step('For starters, some project details:');

  const fields = await group(
    {
      ownerName: () =>
        text({
          message: 'Owner',
          placeholder: 'SEEK-Jobs/my-team',
          validate: validateOwnerName,
        }),
      repoName: () =>
        text({
          message: 'Repo',
          placeholder: 'my-repo',
          validate: (value) => {
            const invalid = validateRepoName(value);

            if (invalid || !value) {
              return invalid;
            }

            return pathExistsSync(value)
              ? `'${value}' is an existing directory`
              : undefined;
          },
        }),
      platformName: platformPrompt,
      defaultBranch: defaultBranchPrompt,
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

  return {
    ...fields,
    // The repository hosts this project alone.
    projectName: fields.repoName,
    destinationDir: fields.repoName,
  };
};

const promptWorkspaceFields = async (
  defaults: ExistingRepoDefaults,
): Promise<PromptedProject> => {
  log.step('For starters, some project details:');

  const projectName = handleCancel(
    await text({
      message: 'Project name',
      placeholder: 'my-worker',
      validate: (value) => {
        if (!value) {
          return 'Required';
        }

        return isProjectName(value)
          ? undefined
          : 'Must be a lowercase alphanumeric name, optionally separated by . - _';
      },
    }),
  );

  const projectDir = handleCancel(
    await text({
      message: `Project directory, relative to ${defaults.workspaceRoot}`,
      initialValue: [defaults.parentDir, projectName].filter(Boolean).join('/'),
      validate: (value) => validateProjectDir(defaults.workspaceRoot, value),
    }),
  );

  const fields = await group(
    {
      ownerName: () =>
        text({
          message: 'Owner',
          initialValue: defaults.ownerName,
          placeholder: 'SEEK-Jobs/my-team',
          validate: validateOwnerName,
        }),
      // The project is a member of the existing repository, so this stays the
      // repository's own name rather than the project's.
      repoName: () =>
        text({
          message: 'Repo',
          initialValue: defaults.repoName,
          placeholder: 'my-repo',
          validate: validateRepoName,
        }),
      platformName: platformPrompt,
      defaultBranch: defaultBranchPrompt,
    },
    {
      onCancel: cancelPrompt,
    },
  );

  return {
    ...fields,
    projectName,
    // The workspace root owns Renovate config, so there is nothing to ask for.
    renovatePreset: BASE_PROMPT_DEFAULTS.renovatePreset,
    destinationDir: nodePath.relative(
      process.cwd(),
      nodePath.resolve(defaults.workspaceRoot, projectDir),
    ),
  };
};

export const promptBaseFields = async (
  existingRepo?: ExistingRepoDefaults,
): Promise<PromptedProject> =>
  existingRepo ? promptWorkspaceFields(existingRepo) : promptStandaloneFields();

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
            initialValue: choice.initialValue,
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

export const confirmExistingRepo = async (workspaceRoot: string) =>
  handleCancel(
    await confirm({
      message: `Scaffold into the existing repository at ${workspaceRoot}?`,
      initialValue: false,
    }),
  );

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
