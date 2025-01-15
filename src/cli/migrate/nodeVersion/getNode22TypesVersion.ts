import { execSync } from 'child_process';

export const getNode22TypesVersion = (major: number) =>
  execSync(
    `npm show @types/node@^${major} version --json | jq '.[-1]'`,
  ).toString();
