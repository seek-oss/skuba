import { cpus } from 'os';
import stream from 'stream';
import util from 'util';

import chalk from 'chalk';
import concurrently from 'concurrently';
import execa, { ExecaChildProcess } from 'execa';
import npmRunPath from 'npm-run-path';
import npmWhich from 'npm-which';

import { ConcurrentlyErrors, isErrorWithCode } from './error';
import { log } from './logging';

class YarnSpamFilter extends stream.Transform {
  silenced = false;

  _transform(
    chunk: any,
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
    chunk: any,
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
  prefixColor?: string;
}

type ExecOptions = execa.Options & { streamStdio?: true | 'yarn' };

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

  switch (opts?.streamStdio) {
    case 'yarn':
      const stderrFilter = new YarnWarningFilter();
      const stdoutFilter = new YarnSpamFilter();

      subprocess.stderr?.pipe(stderrFilter).pipe(process.stderr);
      subprocess.stdout?.pipe(stdoutFilter).pipe(process.stdout);

      break;

    case true:
      subprocess.stderr?.pipe(process.stderr);
      subprocess.stdout?.pipe(process.stdout);

      break;
  }

  return subprocess;
};

const whichCallback = npmWhich(__dirname);

const which = util.promisify<string, string>(whichCallback);

export const createExec =
  (opts: ExecOptions): Exec =>
  (command, ...args) =>
    runCommand(command, args, opts);

export const exec: Exec = (command, ...args) => runCommand(command, args);

export const execConcurrently = async (
  commands: ExecConcurrentlyCommand[],
  /**
   * A set length to pad names to.
   *
   * If this argument is not supplied, the length will be inferred from the
   * longest name in `commands`.
   */
  nameLength?: number,
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
        prefixColor,
      })),
      {
        // Run serially on Buildkite, where we often use puny agents.
        maxProcesses: process.env.BUILDKITE ? 1 : cpus().length,
        // Use a minimalist logging prefix.
        prefix: '{name} |',
      },
    );
  } catch (err: unknown) {
    const result = ConcurrentlyErrors.validate(err);

    if (!result.success) {
      throw err;
    }

    const messages = result.value
      .filter(({ exitCode }) => exitCode !== 0)
      .sort(({ index: indexA }, { index: indexB }) => indexA - indexB)
      .map(
        (a) =>
          `[${a.command.name}] ${chalk.bold(
            a.command.command,
          )} exited with code ${chalk.bold(a.exitCode)}`,
      );

    log.newline();

    messages.forEach((message) => log.err(message));
    log.newline();

    throw Error(
      `${messages.length} subprocess${
        messages.length === 1 ? '' : 'es'
      } failed.`,
    );
  }
};

export const ensureCommands = async (...names: string[]) => {
  let success = true;

  await Promise.all(
    names.map(async (name) => {
      try {
        return await which(name);
      } catch (err: unknown) {
        if (isErrorWithCode(err, 'ENOENT')) {
          success = false;

          return log.err(log.bold(name), 'needs to be installed.');
        }

        throw err;
      }
    }),
  );

  if (!success) {
    process.exit(1);
  }
};
