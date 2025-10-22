import { describe, expect, it } from 'vitest';
import { defaultOpts, executeModule } from '../testing/module.js';

import { nodemonModule } from './nodemon.js';

describe('nodemonModule', () => {
  it('works from scratch', async () => {
    const inputFiles = {};

    const outputFiles = await executeModule(
      nodemonModule,
      inputFiles,
      defaultOpts,
    );

    expect(outputFiles['nodemon.json']).toBeUndefined();
  });
});
