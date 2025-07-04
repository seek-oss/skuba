import assert from 'assert';

import { COMMAND_ALIASES } from './command.js';

export const hasDebugFlag = (args = process.argv) =>
  args.some((arg) => arg.toLocaleLowerCase() === '--debug');

export const hasSerialFlag = (args = process.argv, env = process.env) =>
  args.some((arg) => arg.toLocaleLowerCase() === '--serial') ||
  Boolean(
    // Run serially on SEEK's central npm publishing pipeline.
    // Exhausting agents here can cause grief.
    env.BUILDKITE_AGENT_META_DATA_QUEUE?.split(',').some((queueName) =>
      queueName.startsWith('artefacts:npm'),
    ),
  );

/**
 * Parse process arguments.
 *
 * This function mutates the input list by removing the command name element.
 * Downstream commands can access their args with an ordinary
 * `process.argv.slice(2)`.
 *
 * Example input:
 *
 * ```typescript
 * ['/bin/node', 'node_modules/.bin/skuba', 'test', '--foo', '--bar']
 * ```
 */
export const parseProcessArgs = (args = process.argv) => {
  const skubaIdx = args.findIndex((chunk) => /skuba(\.[jt]s)?$/.test(chunk));

  assert(skubaIdx >= 0, 'Cannot parse args for `skuba`');

  const rawCommand = (args[skubaIdx + 1] ?? 'help').toLocaleLowerCase();

  const commandName = COMMAND_ALIASES[rawCommand] ?? rawCommand;

  const payload = {
    commandName,
    args: args.slice(skubaIdx + 2),
  };

  args.splice(skubaIdx + 1, 1);

  return payload;
};

interface RunArgs {
  /** The path to the entry point script. */
  entryPoint?: string;

  /** The port to start an HTTP server on. */
  port?: number;

  /** Arguments passed through to the Node.js executable. */
  node: string[];

  /** Arguments passed through to the entry point script. */
  script: string[];
}

/**
 * Make a best effort to parse "run" args.
 *
 * These are arguments that would be passed to `skuba node` or `skuba start`.
 * Parsing is handrolled because we support some weird and wonderful behaviour:
 *
 * - The `--port` option may be intended for skuba itself
 * - The `--inspect` options may be intended for the Node.js inspector
 * - The entry point may be omitted in favour of `package.json` inference
 * - Other args may be intended for propagation to the entry point
 */
export const parseRunArgs = (argv: string[]): RunArgs => {
  const state: RunArgs = {
    node: [],
    script: [],
  };

  let args = argv.filter((element) => element.length);

  while (args.length) {
    args = parseRunArgsIteration(state, args);
  }

  return state;
};

const isDigits = (arg: unknown): arg is string =>
  typeof arg === 'string' && /^\d+$/.test(arg);

const parseRunArgsIteration = (state: RunArgs, args: string[]): string[] => {
  const [arg1, arg2] = args;

  if (!arg1) {
    return [];
  }

  if (/^--inspect(-brk)?=\d+$/.test(arg1)) {
    state.node.push(arg1);
    return args.slice(1);
  }

  // Node.js inspector options that are optionally followed by a numeric port.
  if (['--inspect', '--inspect-brk'].includes(arg1)) {
    if (isDigits(arg2)) {
      state.node.push(`${arg1}=${arg2}`);
      return args.slice(2);
    }

    state.node.push(arg1);

    if (arg2) {
      // Some other string that doesn't relate to the Node.js inspector option.
      // This is presumably the entry point script to run.
      state.entryPoint = arg2;
      state.script.push(...args.slice(2));
    }

    return [];
  }

  if (/^--port=\d+$/.test(arg1)) {
    state.port = Number(arg1.slice(7));
    return args.slice(1);
  }

  if (arg1 === '--port') {
    if (isDigits(arg2)) {
      state.port = Number(arg2);
      return args.slice(2);
    }

    // Invalid port argument; eat it.
    return args.slice(1);
  }

  state.entryPoint = arg1;
  state.script.push(...args.slice(1));
  return [];
};
