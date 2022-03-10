'use strict';
/**
 * OpenTelemetry tracing initialisation. This is a standalone TS/JS module that is not
 * referenced by application source code directly. It is required at runtime using the
 * node command's `--require` argument, see Dockerfile for details.
 */
var __assign =
  (this && this.__assign) ||
  function () {
    __assign =
      Object.assign ||
      function (t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
          s = arguments[i];
          for (var p in s)
            if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
        }
        return t;
      };
    return __assign.apply(this, arguments);
  };
exports.__esModule = true;
var api_1 = require('@opentelemetry/api');
var core_1 = require('@opentelemetry/core');
var exporter_collector_grpc_1 = require('@opentelemetry/exporter-collector-grpc');
var instrumentation_aws_sdk_1 = require('@opentelemetry/instrumentation-aws-sdk');
var instrumentation_http_1 = require('@opentelemetry/instrumentation-http');
var propagator_b3_1 = require('@opentelemetry/propagator-b3');
var sdk_node_1 = require('@opentelemetry/sdk-node');
var app = 'opentelemetry';
var log = function (level, msg, extra) {
  if (extra === void 0) {
    extra = {};
  }
  var toLog = __assign(
    { msg: msg, level: level, app: app, time: new Date().toISOString() },
    extra,
  );
  console.log(JSON.stringify(toLog)); // eslint-disable-line no-console
};
var main = function () {
  // Use B3 propagation to ensure proper propagation between systems that use
  // OpenTelemetry and native Datadog APM, such as Istio/Envoy.
  api_1.propagation.setGlobalPropagator(
    new core_1.CompositePropagator({
      propagators: [
        new propagator_b3_1.B3Propagator(),
        new propagator_b3_1.B3Propagator({
          injectEncoding: propagator_b3_1.B3InjectEncoding.MULTI_HEADER,
        }),
      ],
    }),
  );
  var sdk = new sdk_node_1.NodeSDK({
    traceExporter: new exporter_collector_grpc_1.CollectorTraceExporter(),
    autoDetectResources: false,
    instrumentations: [
      new instrumentation_http_1.HttpInstrumentation(),
      new instrumentation_aws_sdk_1.AwsInstrumentation(),
    ],
  });
  sdk
    .start()
    .then(function () {
      return log('info', 'OpenTelemetry initialised');
    })
    ['catch'](function (err) {
      return log('error', 'OpenTelemetry not initialised', { err: err });
    });
  process.on('SIGTERM', function () {
    sdk
      .shutdown()
      .then(function () {
        return log('info', 'OpenTelemetry successfully terminated');
      })
      ['catch'](function (err) {
        return log('error', 'OpenTelemetry failed to terminate', { err: err });
      })
      ['finally'](function () {
        return process.exit(0);
      }); // eslint-disable-line no-process-exit
  });
};
if (process.env.OPENTELEMETRY_ENABLED === 'true') {
  main();
} else {
  log('info', 'OpenTelemetry not enabled');
}
