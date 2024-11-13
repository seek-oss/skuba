import { execSync } from 'child_process';

export const getNode22TypesVersion = () =>
  execSync("npm show @types/node@^22 version --json | jq '.[-1]'").toString();
