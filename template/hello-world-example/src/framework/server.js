"use strict";
exports.__esModule = true;
exports.createApp = void 0;
var koa_1 = require("koa");
var koa_compose_1 = require("koa-compose");
var seek_koala_1 = require("seek-koala");
var config_1 = require("src/config");
var logging_1 = require("src/framework/logging");
var metrics_1 = require("src/framework/metrics");
var metrics = seek_koala_1.MetricsMiddleware.create(metrics_1.metricsClient, function (_a) {
    var _matchedRoute = _a._matchedRoute;
    return ({
        route: typeof _matchedRoute === 'string' ? _matchedRoute : 'unspecified'
    });
});
var requestLogging = seek_koala_1.RequestLogging.createMiddleware(function (ctx, fields, err) {
    if (ctx.status < 400 && err === undefined) {
        // Depend on sidecar logging for happy path requests
        return;
    }
    return ctx.status < 500
        ? logging_1.rootLogger.info(fields, 'Client error')
        : logging_1.rootLogger.error(fields, 'Server error');
});
var version = seek_koala_1.VersionMiddleware.create({
    name: config_1.config.name,
    version: config_1.config.version
});
var createApp = function () {
    var middleware = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        middleware[_i] = arguments[_i];
    }
    return new koa_1["default"]()
        // TODO: consider using a middleware that adds secure HTTP headers.
        // https://github.com/seek-oss/koala/tree/master/src/secureHeaders
        // https://github.com/venables/koa-helmet
        // .use(SecureHeaders.middleware)
        .use(requestLogging)
        .use(metrics)
        .use(seek_koala_1.ErrorMiddleware.handle)
        .use(version)
        .use((0, koa_compose_1["default"])(middleware));
};
exports.createApp = createApp;
