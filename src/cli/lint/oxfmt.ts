import { styleText } from 'node:util';

import { createLogger } from '../../utils/logging.ts';
import { runOxfmt } from '../adapter/oxfmt.ts';

import type { Input } from './types.ts';

const LOG_PREFIX = styleText('cyan', 'Oxfmt  │');

export const runOxfmtInNewProcess = ({ debug }: Input) =>
  runOxfmt('lint', createLogger({ debug, prefixes: [LOG_PREFIX] }));
