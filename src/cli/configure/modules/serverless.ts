import type { Module, Options } from '../types.js';

export const serverlessModule = ({}: Options): Module => ({
  '**/serverless*.yml': (inputFile, _files, _initialFiles) => {
    if (!inputFile) {
      // Only configure files that exist.
      return;
    }

    return (
      inputFile
        // Rewire packaging patterns.
        .replace(/- (\.?\/)?dist\//g, '- lib/')
        // Rewire handler paths.
        .replace(/handler: (\.?\/)?dist\//g, 'handler: lib/')
    );
  },
});
