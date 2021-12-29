/**
 * OpenTelemetry tracing initialisation. This is a standalone TS/JS module that is not
 * referenced by application source code directly. It is required at runtime using the
 * node command's `--require` argument, see Dockerfile for details.
 */

import { propagation } from '@opentelemetry/api';
import { CompositePropagator } from '@opentelemetry/core';
import { CollectorTraceExporter } from '@opentelemetry/exporter-collector-grpc';
import { AwsInstrumentation } from '@opentelemetry/instrumentation-aws-sdk';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { B3InjectEncoding, B3Propagator } from '@opentelemetry/propagator-b3';
import { NodeSDK } from '@opentelemetry/sdk-node';

const app = 'opentelemetry';
const log = (level: string, msg: string, extra = {}) => {
  const toLog = { msg, level, app, time: new Date().toISOString(), ...extra };
  console.log(JSON.stringify(toLog)); // eslint-disable-line no-console
};

const main = () => {
  // Use B3 propagation to ensure proper propagation between systems that use
  // OpenTelemetry and native Datadog APM, such as Istio/Envoy.
  propagation.setGlobalPropagator(
    new CompositePropagator({
      propagators: [
        new B3Propagator(),
        new B3Propagator({ injectEncoding: B3InjectEncoding.MULTI_HEADER }),
      ],
    }),
  );

  const sdk = new NodeSDK({
    traceExporter: new CollectorTraceExporter(),
    autoDetectResources: false,
    instrumentations: [new HttpInstrumentation(), new AwsInstrumentation()],
  });

  sdk
    .start()
    .then(() => log('info', 'OpenTelemetry initialised'))
    .catch((err: Error) =>
      log('error', 'OpenTelemetry not initialised', { err }),
    );

  process.on('SIGTERM', () => {
    sdk
      .shutdown()
      .then(() => log('info', 'OpenTelemetry successfully terminated'))
      .catch((err: Error) =>
        log('error', 'OpenTelemetry failed to terminate', { err }),
      )
      .finally(() => process.exit(0)); // eslint-disable-line no-process-exit
  });
};

if (process.env.OPENTELEMETRY_ENABLED === 'true') {
  main();
} else {
  log('info', 'OpenTelemetry not enabled');
}
