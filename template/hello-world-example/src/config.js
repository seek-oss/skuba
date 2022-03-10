"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var _a;
exports.__esModule = true;
exports.config = void 0;
var skuba_dive_1 = require("skuba-dive");
var dev = '<%- gantryEnvironmentName %>';
var prod = '<%- gantryEnvironmentName %>';
var environments = ['local', 'test', dev, prod];
var environment = skuba_dive_1.Env.oneOf(environments)('ENVIRONMENT');
/* istanbul ignore next: config verification makes more sense in a smoke test */
var configs = (_a = {
        local: function () { return ({
            logLevel: 'debug',
            name: '<%- serviceName %>',
            version: 'local'
        }); },
        test: function () { return (__assign(__assign({}, configs.local()), { logLevel: skuba_dive_1.Env.string('LOG_LEVEL', { "default": 'silent' }), version: 'test' })); }
    },
    _a[dev] = function () { return (__assign(__assign({}, configs[prod]()), { logLevel: 'debug' })); },
    _a[prod] = function () { return ({
        logLevel: 'info',
        name: skuba_dive_1.Env.string('SERVICE'),
        version: skuba_dive_1.Env.string('VERSION'),
        metricsServer: 'localhost',
        port: skuba_dive_1.Env.nonNegativeInteger('PORT')
    }); },
    _a);
exports.config = __assign(__assign({}, configs[environment]()), { environment: environment });
