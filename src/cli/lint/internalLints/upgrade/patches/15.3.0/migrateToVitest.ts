import { inspect } from 'util';

import { log } from '../../../../../../utils/logging.js';
import { migrateToVitest } from '../../../../../migrate/vitest/vitest.js';
import type { PatchFunction } from '../../index.js';

export const tryMigrateToVitest: PatchFunction = async (config) => {
  try {
    return await migrateToVitest(config);
  } catch (err) {
    log.warn('Failed to migrate to Vitest');
    log.subtle(inspect(err));
    return { result: 'skip', reason: 'due to an error' };
  }
};
