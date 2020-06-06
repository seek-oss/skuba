import util from 'util';

import chalk from 'chalk';
import concurrently from 'concurrently';
import execa from 'execa';
import npmRunPath from 'npm-run-path';
import npmWhich from 'npm-which';

import { isErrorWithCode } from './error';

interface ExecConcurrentlyCommand {
  command: string;
  name: string;
}

type ExecOptions = execa.Options & { streamStdio?: true };

const envWithPath = {
  PATH: npmRunPath({ cwd: __dirname }),
};

const runCommand = (command: string, args: string[], opts?: ExecOptions) => {
  const subprocess = execa(command, args, {
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
    commands.map((command) => ({
      ...command,
      env: envWithPath,
    })),
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
