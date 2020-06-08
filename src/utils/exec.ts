import util from 'util';

import chalk from 'chalk';
import concurrently, { CommandObj } from 'concurrently';
import execa from 'execa';
import npmRunPath from 'npm-run-path';
import npmWhich from 'npm-which';

import { isErrorWithCode } from './error';

interface ExecConcurrentlyCommand {
  command: string;
  name: string;

  /**
   * Whether to try to resolve the npm binary through a shim if skuba detects
   * that it is running in a Yarn Plug'n'Play environment.
   *
   * npm binaries can't be located through conventional `node_modules/.bin`
   * means with PnP.
   */
  pnp?: boolean;
}

type ExecOptions = execa.Options & {
  /**
   * Whether to try to resolve the command through a shim if skuba detects that
   * it is running in a Yarn Plug'n'Play environment.
   *
   * Enable this for npm "binaries"; they can't be located through conventional
   * `node_modules/.bin` means when PnP is enabled.
   */
  pnp?: boolean;

  streamStdio?: true;
};

const NPM_RUN_PATH = npmRunPath({ cwd: __dirname });

const withPnpShim = (
  isEnabled: boolean | undefined,
  command: string,
  args: string[],
) => {
  if (!isEnabled || !process.versions.hasOwnProperty('pnp')) {
    return { command, args };
  }

  const shimPath = require.resolve('./pnp');

  return {
    command: 'node',
    args: [shimPath, command, ...args],
  };
};

const runCommand = (command: string, args: string[], opts?: ExecOptions) => {
  const resolved = withPnpShim(opts?.pnp, command, args);

  const subprocess = execa(resolved.command, resolved.args, {
    localDir: __dirname,
    preferLocal: true,
    stdio: 'inherit',
    ...opts,
  });

  if (opts?.streamStdio === true) {
    subprocess.stderr?.pipe(process.stderr);
    subprocess.stdout?.pipe(process.stdout);
  }

  return subprocess;
};

const whichCallback = npmWhich(__dirname);

const which = util.promisify<string, string>(whichCallback);

export const createExec = (opts: ExecOptions) => (
  command: string,
  ...args: string[]
) => runCommand(command, args, opts);

export const exec = async (command: string, ...args: string[]) =>
  runCommand(command, args);

export const execConcurrently = (commands: ExecConcurrentlyCommand[]) =>
  concurrently(
    commands.map(({ command, pnp, ...rest }) => {
      const resolved = withPnpShim(pnp, command, []);

      const obj: CommandObj = {
        ...rest,
        command: [resolved.command, ...resolved.args].join(' '),
        env: pnp ? undefined : { PATH: NPM_RUN_PATH },
      };

      return obj;
    }),
  );

export const ensureCommands = async (...names: string[]) => {
  let success = true;

  await Promise.all(
    names.map(async (name) => {
      try {
        return await which(name);
      } catch (err) {
        if (isErrorWithCode(err, 'ENOENT')) {
          success = false;

          return console.error(chalk.bold(name), 'needs to be installed.');
        }

        throw err;
      }
    }),
  );

  if (!success) {
    process.exit(1);
  }
};
