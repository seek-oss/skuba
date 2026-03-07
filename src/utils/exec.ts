import type { styleText } from 'node:util';
import { cpus } from 'os';
import stream from 'stream';
import util from 'util';

import concurrently from 'concurrently';
import execa, { type ExecaChildProcess } from 'execa';
import npmRunPath from 'npm-run-path';
import npmWhich from 'npm-which';

import { concurrentlyErrorsSchema, isErrorWithCode } from './error.js';
import { log } from './logging.js';
import type { PackageManager } from './packageManager.js';

type StyleColor = Parameters<typeof styleText>[0];

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

export type Exec = (
  command: string,
  ...args: string[]
) => ExecaChildProcess<string>;

interface ExecConcurrentlyCommand {
  command: string;
  name: string;
  prefixColor?: StyleColor;
}

interface ExecConcurrentlyOptions {
  /**
   * The maximum number of processes that can execute concurrently.
   *
   * Defaults to the CPU core count.
   */
  maxProcesses?: number;

  /**
   * A set length to pad names to.
   *
   * Defaults to the length of the longest command name.
   */
  nameLength?: number;

  /**
   * The stream that logging output will be written to.
   *
   * Defaults to `process.stdout`.
   */
  outputStream?: stream.Writable;
}

type ExecOptions = execa.Options & { streamStdio?: true | PackageManager };

const envWithPath = {
  PATH: npmRunPath({ cwd: import.meta.dirname }),
};

const runCommand = (command: string, args: string[], opts?: ExecOptions) => {
  const subprocess = execa(command, args, {
    localDir: import.meta.dirname,
    preferLocal: true,
    stdio: 'inherit',
    ...opts,
  });

  switch (opts?.streamStdio) {
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

  return subprocess;
};

const whichCallback = npmWhich(import.meta.dirname);

const which = util.promisify<string, string>(whichCallback);

export const createExec =
  (opts: ExecOptions): Exec =>
  (command, ...args) =>
    runCommand(command, args, opts);

export const exec: Exec = (command, ...args) => runCommand(command, args);

export const execConcurrently = async (
  commands: ExecConcurrentlyCommand[],
  { maxProcesses, nameLength, outputStream }: ExecConcurrentlyOptions = {},
) => {
  const maxNameLength =
    nameLength ??
    commands.reduce(
      (length, command) => Math.max(length, command.name.length),
      0,
    );

  try {
    await concurrently(
      commands.map(({ command, name, prefixColor }) => ({
        command,
        env: envWithPath,
        name: name.padEnd(maxNameLength),
        prefixColor: Array.isArray(prefixColor) ? prefixColor[0] : prefixColor,
      })),
      {
        maxProcesses: maxProcesses ?? cpus().length,

        outputStream,

        // Use a minimalist logging prefix.
        prefix: '{name} │',
      },
    ).result;
  } catch (err) {
    const result = concurrentlyErrorsSchema.safeParse(err);

    if (!result.success) {
      throw err;
    }

    const failed = result.data
      .filter(({ exitCode }) => exitCode !== 0)
      .sort(({ index: indexA }, { index: indexB }) => indexA - indexB)
      .map((subprocess) => subprocess.command.name);

    throw Error(
      `${failed.join(', ')} subprocess${
        failed.length === 1 ? '' : 'es'
      } failed.`,
    );
  }
};

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
