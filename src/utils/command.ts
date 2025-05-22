import path from 'path';

export type Command = (typeof COMMAND_LIST)[number];

export const COMMAND_ALIASES: Record<string, Command> = {
  '-h': 'help',
  '--help': 'help',
  '-v': 'version',
  '--version': 'version',
};

export const getCommandDir = () => {
  if (__filename.endsWith('.ts')) {
    return path.join(__filename, '..', '..', 'cli');
  }
  return path.join(__filename, '..', 'cli');
};

path.join(__filename, '..', 'cli');

export const COMMAND_LIST = [
  'build',
  'build-package',
  'configure',
  'format',
  'help',
  'init',
  'lint',
  'migrate',
  'node',
  'release',
  'start',
  'test',
  'version',
] as const;

export const COMMAND_SET = new Set<string>(COMMAND_LIST);

export const commandToModule = (command: Command): string =>
  command
    .split('-')
    .map((segment, index) =>
      index === 0
        ? segment
        : `${(segment[0] ?? '').toLocaleUpperCase()}${segment.slice(1)}`,
    )
    .join('');
