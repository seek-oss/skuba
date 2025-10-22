import { afterAll, afterEach, expect, it, vi } from 'vitest';
import { App, aws_secretsmanager, aws_sns } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';

const originalDeployment = process.env.DEPLOYMENT;
const originalVersion = process.env.VERSION;

afterAll(() => {
  process.env.DEPLOYMENT = originalDeployment;
  process.env.VERSION = originalVersion;
});

afterEach(() => {
  vi.resetModules();
});

it.each(['dev', 'prod'])(
  'returns expected CloudFormation stack for %s',
  async (deployment) => {
    process.env.DEPLOYMENT = deployment;
    process.env.VERSION = 'local';

    const { AppStack } = await import('./appStack.js');

    vi.spyOn(aws_sns.Topic, 'fromTopicArn').mockImplementation(
      (scope, id) => new aws_sns.Topic(scope, id),
    );

    vi.spyOn(
      aws_secretsmanager.Secret,
      'fromSecretPartialArn',
    ).mockImplementation(
      (scope, id) => new aws_secretsmanager.Secret(scope, id),
    );

    const app = new App({ context: { 'aws:cdk:bundling-stacks': [] } });

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
        /"DD_TAGS":"git.commit.sha:([0-9a-f]+),git.repository_url:([^\"]+)",/g,
        '',
      )
      .replaceAll(/(layer:Datadog-[^-]+-.+?:)\d+/g, (_, layer) => `${layer}x`);
    expect(JSON.parse(json)).toMatchSnapshot();
  },
);
