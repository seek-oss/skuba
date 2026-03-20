import * as Jest from '../../lib/api/jest/index.js';

export default Jest.mergePreset({
  coverageThreshold: {
    global: {
      branches: 84,
      functions: 58,
      lines: 81,
      statements: 79,
    },
  },
});
