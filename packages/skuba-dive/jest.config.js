const { Jest } = require('skuba');

module.exports = Jest.mergePreset({
  coverageThreshold: {
    global: {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100,
    },
  },
});
