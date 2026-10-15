export const isGitHubOrg = (value: string) =>
  /^[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?$/.test(value) &&
  !value.includes('--');

export const isGitHubRepo = (value: string) =>
  /^[A-Za-z0-9_.-]+$/.test(value) && value !== '.' && value !== '..';

/**
 * Checks that a value works as both a directory name and an npm package name,
 * which the project name is used for in a workspace.
 */
export const isProjectName = (value: string) =>
  /^[a-z0-9](?:[a-z0-9._-]*[a-z0-9])?$/.test(value);

export const isGitHubTeam = (value: string) =>
  /^[A-Za-z0-9_](?:[A-Za-z0-9_-]*[A-Za-z0-9_])?$/.test(value) &&
  !value.endsWith('-') &&
  !value.includes('--');

const PLATFORMS = ['amd64', 'arm64'] as const;

export type Platform = (typeof PLATFORMS)[number];

const platformSet = new Set<unknown>(PLATFORMS);

export const isPlatform = (value: unknown) => platformSet.has(value);
