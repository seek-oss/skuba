import stream from 'stream';
import util from 'util';

import { type Options, type ResultPromise, execa } from 'execa';
import npmWhich from 'npm-which';

import { isErrorWithCode } from './error.js';
import { log } from './logging.js';
import type { PackageManager } from './packageManager.js';

class YarnSpamFilter extends stream.Transform {
  silenced = false;

  _transform(
    chunk: Uint8Array,
    _encoding: BufferEncoding,
    callback: stream.TransformCallback,
  ) {
    const str = Buffer.from(chunk).toString();

    // Yarn spews the entire installed dependency tree after this message
    if (str.startsWith('info Direct dependencies')) {
      this.silenced = true;
    }

    if (
      !this.silenced &&
      // This isn't very useful given the command generates a lockfile
      !str.startsWith('info No lockfile found')
    ) {
      this.push(chunk);
    }

    callback();
  }
}

class YarnWarningFilter extends stream.Transform {
  _transform(
    chunk: Uint8Array,
    _encoding: BufferEncoding,
    callback: stream.TransformCallback,
  ) {
    const str = Buffer.from(chunk).toString();

    // Filter out annoying deprecation warnings that users can do little about
    if (!str.startsWith('warning skuba >')) {
      this.push(chunk);
    }

    callback();
  }
}

export type Exec<T extends Options = Options> = (
  command: string,
  ...args: string[]
) => ResultPromise<T>;

type ExecOptions<T extends Options> = T & StreamStdioOptions;

type StreamStdioOptions = { streamStdio?: true | PackageManager };

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

  switch (streamStdio) {
    case 'yarn':
      const stderrFilter = new YarnWarningFilter();
      const stdoutFilter = new YarnSpamFilter();

      subprocess.stderr?.pipe(stderrFilter).pipe(process.stderr);
      subprocess.stdout?.pipe(stdoutFilter).pipe(process.stdout);

      break;

    case 'pnpm':
    case true:
      subprocess.stderr?.pipe(process.stderr);
      subprocess.stdout?.pipe(process.stdout);

      break;
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
