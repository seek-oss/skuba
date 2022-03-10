'use strict';
exports.__esModule = true;
exports.metricsClient = void 0;
var hot_shots_1 = require('hot-shots');
var seek_datadog_custom_metrics_1 = require('seek-datadog-custom-metrics');
var config_1 = require('src/config');
var logging_1 = require('./logging');
/* istanbul ignore next: StatsD client is not our responsibility */
exports.metricsClient = (0, seek_datadog_custom_metrics_1.createStatsDClient)(
  hot_shots_1.StatsD,
  config_1.config,
  function (err) {
    return logging_1.rootLogger.error({ err: err }, 'StatsD error');
  },
);
