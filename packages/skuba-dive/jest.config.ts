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
  moduleNameMapper: {
    // https://github.com/kulshekhar/ts-jest/issues/1057#issuecomment-1482644543
    '^(\\.\\.?\\/.+)\\.jsx?$': '$1',
  },
});
