"use strict";
exports.__esModule = true;
exports.router = void 0;
var router_1 = require("@koa/router");
var healthCheck_1 = require("./healthCheck");
var jobs_1 = require("./jobs");
var smokeTest_1 = require("./smokeTest");
exports.router = new router_1["default"]()
    .get('/health', healthCheck_1.healthCheckHandler)
    .get('/smoke', smokeTest_1.smokeTestHandler)
    .use('/jobs', jobs_1.jobRouter.routes());
