import { SynthUtils } from '@aws-cdk/assert';
import { App } from 'aws-cdk-lib';

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

it.each(contexts)(
  'returns expected CloudFormation stack for $stage',
  (context) => {
    const app = new App({ context });

    const stack = new AppStack(app, 'appStack');

    const json = JSON.stringify(SynthUtils.toCloudFormation(stack)).replace(
      /"S3Key":"([0-9a-f]+)\.zip"/g,
      (_, hash) => `"S3Key":"${'x'.repeat(hash.length)}.zip"`,
    );

    expect(JSON.parse(json)).toMatchSnapshot();
  },
);
