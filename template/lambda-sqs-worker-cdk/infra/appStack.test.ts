import { App, aws_secretsmanager, aws_sns } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';

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

const originalEnv = process.env.ENVIRONMENT;
const originalVersion = process.env.VERSION;

afterAll(() => {
  process.env.ENVIRONMENT = originalEnv;
  process.env.VERSION = originalVersion;
});

afterEach(() => {
  jest.resetModules();
});

it.each(['dev', 'prod'])(
  'returns expected CloudFormation stack for %s',
  async (env) => {
    process.env.ENVIRONMENT = env;
    process.env.VERSION = 'local';

    const { AppStack } = await import('./appStack');

    jest
      .spyOn(aws_sns.Topic, 'fromTopicArn')
      .mockImplementation((scope, id) => new aws_sns.Topic(scope, id));

    jest
      .spyOn(aws_secretsmanager.Secret, 'fromSecretPartialArn')
      .mockImplementation(
        (scope, id) => new aws_secretsmanager.Secret(scope, id),
      );

    const app = new App();

    const stack = new AppStack(app, 'appStack');

    const template = Template.fromStack(stack);

    const json = JSON.stringify(template.toJSON())
      .replace(
        /"S3Key":"([0-9a-f]+)\.zip"/g,
        (_, hash) => `"S3Key":"${'x'.repeat(hash.length)}.zip"`,
      )
      .replace(
        /workerCurrentVersion([0-9a-zA-Z]+)"/g,
        (_, hash) => `workerCurrentVersion${'x'.repeat(hash.length)}"`,
      )
      .replaceAll(
        /"Value":"\d+\.\d+\.\d+-([^"]+)"/g,
        (_, hash) => `"Value": "x.x.x-${'x'.repeat(hash.length)}"`,
      )
      .replaceAll(/"Value":"v\d+\.\d+\.\d+"/g, (_) => `"Value": "vx.x.x"`)
      .replace(
        /"DD_TAGS":"git.commit.sha:([0-9a-f]+),git.repository_url:([^\"]+)"/g,
        (_, sha, url) =>
          `"DD_TAGS":"git.commit.sha:${'x'.repeat(sha.length)},git.repository_url:${'x'.repeat(url.length)}"`,
      )
      .replaceAll(
        /(layer:Datadog-Extension-.+?:)\d+/g,
        (_, layer) => `${layer}x`,
      );
    expect(JSON.parse(json)).toMatchSnapshot();
  },
);
