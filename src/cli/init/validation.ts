export const isGitHubOrg = (value: string) =>
  /^[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?$/.test(value) &&
  !value.includes('--');

export const isGitHubRepo = (value: string) =>
  /^[A-Za-z0-9_.-]+$/.test(value) && value !== '.' && value !== '..';

export const isGitHubTeam = (value: string) =>
  /^[A-Za-z0-9_](?:[A-Za-z0-9_-]*[A-Za-z0-9_])?$/.test(value) &&
  !value.endsWith('-') &&
  !value.includes('--');
