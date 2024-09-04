import stream from 'stream';
import util from 'util';

import chalk from 'chalk';
import concurrently from 'concurrently';
import execa, { ExecaChildProcess } from 'execa';
import npmRunPath from 'npm-run-path';
import npmWhich from 'npm-which';

import { ConcurrentlyErrors, isErrorWithCode } from './error';
import { log } from './logging';

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

type ExecOptions = execa.Options & { streamStdio?: true | 'pnpm' };

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
    case 'pnpm':
      const filter = new YarnWarningFilter();

      subprocess.stderr?.pipe(filter).pipe(process.stderr);
      subprocess.stdout?.pipe(process.stdout);

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

export const createExec = (opts: ExecOptions): Exec => (command, ...args) =>
  runCommand(command, args, opts);

export const exec: Exec = (command, ...args) => runCommand(command, args);

export const execConcurrently = async (commands: ExecConcurrentlyCommand[]) => {
  const maxNameLength = commands.reduce(
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
