"use strict";
exports.__esModule = true;
exports.contextLogger = exports.rootLogger = void 0;
var logger_1 = require("@seek/logger");
var seek_koala_1 = require("seek-koala");
var config_1 = require("src/config");
exports.rootLogger = (0, logger_1["default"])({
    base: {
        environment: config_1.config.environment,
        version: config_1.config.version
    },
    level: config_1.config.logLevel,
    name: config_1.config.name,
    transport: config_1.config.environment === 'local' ? { target: 'pino-pretty' } : undefined
});
var contextLogger = function (ctx) {
    return exports.rootLogger.child(seek_koala_1.RequestLogging.contextFields(ctx));
};
exports.contextLogger = contextLogger;
