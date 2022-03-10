"use strict";
exports.__esModule = true;
exports.jobRouter = void 0;
var router_1 = require("@koa/router");
var middleware_1 = require("src/framework/middleware");
var getJobs_1 = require("./getJobs");
var postJob_1 = require("./postJob");
exports.jobRouter = new router_1["default"]()
    .get('/', getJobs_1.getJobsHandler)
    .post('/', middleware_1.jsonBodyParser, postJob_1.postJobHandler);
