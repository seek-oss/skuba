const config = require('./config/eslint');

module.exports = {
  ...config,

  rules: {
    ...config.rules,

    // internal to skuba
    'no-process-exit': 'off',
  },
};
