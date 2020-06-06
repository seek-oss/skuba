import path from 'path';

export type Command = typeof COMMAND_LIST[number];

export const COMMAND_ALIASES: Record<string, Command> = {
  '-h': 'help',
  '--help': 'help',
  '-v': 'version',
  '--version': 'version',
  'build-package': 'buildPackage',
};

export const COMMAND_DIR = path.join(__dirname, '..', 'cli');

export const COMMAND_LIST = [
  'build',
  'buildPackage',
  'configure',
  'format',
  'help',
  'init',
  'lint',
  'start',
  'test',
  'version',
] as const;

export const COMMAND_SET = new Set<string>(COMMAND_LIST);
