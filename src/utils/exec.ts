import util from 'util';

import { type Options, type ResultPromise, execa } from 'execa';
import npmWhich from 'npm-which';

import { isErrorWithCode } from './error.js';
import { log } from './logging.js';

export type Exec<T extends Options = Options> = (
  command: string,
  ...args: string[]
) => ResultPromise<T>;

type ExecOptions<T extends Options> = T & StreamStdioOptions;

type StreamStdioOptions = { streamStdio?: true };

const runCommand = <T extends Options>(
  command: string,
  args: string[],
  { streamStdio, ...execaOptions }: ExecOptions<T> = {} as T,
) => {
  const subprocess = execa(command, args, {
    localDir: execaOptions?.localDir ?? import.meta.dirname,
    preferLocal: true,
    stdio: 'inherit',
    ...execaOptions,
  });

  if (streamStdio) {
    subprocess.stderr?.pipe(process.stderr);
    subprocess.stdout?.pipe(process.stdout);
  }

  return subprocess as unknown as ResultPromise<T>;
};

const whichCallback = npmWhich(import.meta.dirname);

const which = util.promisify<string, string>(whichCallback);

export const createExec =
  <T extends Options>(opts: ExecOptions<T>): Exec<T> =>
  (command, ...args) =>
    runCommand(command, args, opts);

export const exec: Exec = (command, ...args) => runCommand(command, args);

export const ensureCommands = async (...names: string[]) => {
  let success = true;

  await Promise.all(
    names.map(async (name) => {
      const result = await hasCommand(name);

      if (!result) {
        success = false;

        log.err(log.bold(name), 'needs to be installed.');
      }
    }),
  );

  if (!success) {
    process.exit(1);
  }
};

export const hasCommand = async (name: string) => {
  try {
    await which(name);

    return true;
  } catch (err) {
    if (isErrorWithCode(err, 'ENOENT')) {
      return false;
    }

    throw err;
  }
};
