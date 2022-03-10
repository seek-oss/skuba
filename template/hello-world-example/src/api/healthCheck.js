'use strict';
exports.__esModule = true;
exports.healthCheckHandler = void 0;
/**
 * Signifies that the API is available to serve requests.
 *
 * The deployment environment calls this endpoint to see if the container is
 * unhealthy and needs to be recycled.
 */
var healthCheckHandler = function (ctx) {
  ctx.state.skipRequestLogging = true;
  ctx.body = '';
};
exports.healthCheckHandler = healthCheckHandler;
