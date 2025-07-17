import * as Jest from '../../lib/api/jest/index.js';

export default Jest.mergePreset({
  coverageThreshold: {
    global: {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100,
    },
  },
});
