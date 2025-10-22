import { describe, expect, it } from 'vitest';

import { defaultOpts, executeModule } from '../testing/module.js';

import { tslintModule } from './tslint.js';

describe('tslintModule', () => {
  it('works from scratch', async () => {
    const inputFiles = {};

    const outputFiles = await executeModule(
      tslintModule,
      inputFiles,
      defaultOpts,
    );

    expect(outputFiles['tslint.json']).toBeUndefined();
    expect(outputFiles['tslint.yaml']).toBeUndefined();
  });
});
