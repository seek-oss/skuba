'use strict';
exports.__esModule = true;
require('./register');
var api_1 = require('./api');
var server_1 = require('./framework/server');
var app = (0, server_1.createApp)(
  api_1.router.allowedMethods(),
  api_1.router.routes(),
);
exports['default'] = app;
