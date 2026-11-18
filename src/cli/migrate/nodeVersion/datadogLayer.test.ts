import { describe, expect, it } from 'vitest';

import { patchDatadogNodeLayerVersion } from './datadogLayer.js';

describe('patchDatadogNodeLayerVersion', () => {
  it.each([
    [
      'the Rynovate constant',
      'const DATADOG_NODE_LAYER_VERSION = 126;',
      'const DATADOG_NODE_LAYER_VERSION = 144;',
    ],
    [
      'a typed constant',
      'export const DATADOG_NODE_LAYER_VERSION: number = 130;',
      'export const DATADOG_NODE_LAYER_VERSION: number = 144;',
    ],
    [
      'an inline nodeLayerVersion',
      'new DatadogLambda(this, "datadog", {\n  nodeLayerVersion: 126,\n});',
      'new DatadogLambda(this, "datadog", {\n  nodeLayerVersion: 144,\n});',
    ],
  ])('upgrades %s', (_, before, after) => {
    expect(patchDatadogNodeLayerVersion(before, 144)).toBe(after);
  });

  it.each([
    ['a newer version', 'const DATADOG_NODE_LAYER_VERSION = 150;'],
    ['the same version', 'nodeLayerVersion: 144,'],
    ['a constant reference', 'nodeLayerVersion: DATADOG_NODE_LAYER_VERSION,'],
    ['the extension layer', 'const DATADOG_EXTENSION_LAYER_VERSION = 90;'],
    ['other layer versions', 'pythonLayerVersion: 100,'],
  ])('leaves %s alone', (_, contents) => {
    expect(patchDatadogNodeLayerVersion(contents, 144)).toBe(contents);
  });
});
