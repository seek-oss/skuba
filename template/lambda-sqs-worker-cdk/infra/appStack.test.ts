import { App, aws_sns } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';

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

const currentDate = '1212-12-12T12:12:12.121Z';

jest.useFakeTimers({
  legacyFakeTimers: false,
  doNotFake: [
    'nextTick',
    'setInterval',
    'clearInterval',
    'setTimeout',
    'clearTimeout',
  ],
  now: new Date(currentDate),
});

it.each(contexts)(
  'returns expected CloudFormation stack for $stage',
  (context) => {
    jest
      .spyOn(aws_sns.Topic, 'fromTopicArn')
      .mockImplementation((scope, id) => new aws_sns.Topic(scope, id));

    const app = new App({ context });

    const stack = new AppStack(app, 'appStack');

    const template = Template.fromStack(stack);

    const json = JSON.stringify(template.toJSON())
      .replace(
        /"S3Key":"([0-9a-f]+)\.zip"/g,
        (_, hash) => `"S3Key":"${'x'.repeat(hash.length)}.zip"`,
      )
      .replaceAll(
        /workerCurrentVersion([0-9a-zA-Z]+)"/g,
        (_, hash) => `workerCurrentVersion${'x'.repeat(hash.length)}"`,
      );

    expect(JSON.parse(json)).toMatchSnapshot();
  },
);
