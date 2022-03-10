'use strict';
exports.__esModule = true;
require('./register');
var app_1 = require('./app');
var config_1 = require('./config');
var logging_1 = require('./framework/logging');
// This implements a minimal version of `koa-cluster`'s interface
// If your application is deployed with more than 1 vCPU you can delete this
// file and use `koa-cluster` to run `lib/app`.
var listener = app_1['default'].listen(config_1.config.port, function () {
  var address = listener.address();
  if (typeof address === 'object' && address) {
    logging_1.rootLogger.debug('listening on port ' + address.port);
  }
});
