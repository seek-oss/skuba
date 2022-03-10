'use strict';
exports.__esModule = true;
exports.jsonBodyParser = void 0;
var koa_bodyparser_1 = require('koa-bodyparser');
exports.jsonBodyParser = (0, koa_bodyparser_1['default'])({
  enableTypes: ['json'],
});
