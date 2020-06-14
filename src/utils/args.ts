import assert from 'assert';

import { COMMAND_ALIASES } from './command';

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
export const parseArgs = (args = process.argv) => {
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
