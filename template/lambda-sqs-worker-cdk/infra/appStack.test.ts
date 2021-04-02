import { SynthUtils } from '@aws-cdk/assert';
import { App } from '@aws-cdk/core';

import cdkJson from '../cdk.json';

import { AppStack } from './appStack';

const contexts = [
  {
    stage: 'dev',
    ...cdkJson.context,
  },

  {
    stage: 'prod',
    ...cdkJson.context,
  },
];

it.each(contexts)('returns expected cloud formation stack', (context) => {
  const app = new App({ context });

  const stack = new AppStack(app, 'appStack');

  const json = JSON.stringify(SynthUtils.toCloudFormation(stack))
    .replace(/AssetParameters[a-zA-Z0-9]+/gm, 'AssetParameters...')
    .replace(/"Artifact hash for asset .+"/gm, '"Artifact hash for asset..."');
  expect(JSON.parse(json)).toMatchSnapshot();
});
