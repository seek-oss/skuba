const config = require('./config/eslint');

module.exports = {
  ...config,

  rules: {
    ...config.rules,

    // internal to skuba
    'no-console': 'off',
    'no-process-exit': 'off',
  },
};
