import { styleText } from 'node:util';

import { createLogger } from '../../utils/logging.js';
import { runOxfmt } from '../adapter/oxfmt.js';

import type { Input } from './types.js';

const LOG_PREFIX = styleText('cyan', 'Oxfmt  │');

export const runOxfmtInCurrentThread = ({ debug }: Input) =>
  runOxfmt('lint', createLogger({ debug, prefixes: [LOG_PREFIX] }));
