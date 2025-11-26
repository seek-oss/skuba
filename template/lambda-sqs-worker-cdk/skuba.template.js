/**
 * Run `skuba configure` to finish templating and remove this file.
 */

module.exports = {
  entryPoint: 'src/app.ts#handler',
  fields: [
    {
      name: 'serviceName',
      message: 'Service slug',
      initial: 'my-project',
    },
    {
      name: 'devBuildkiteQueueName',
      message: 'Dev Buildkite queue',
      initial: 'my-team-aws-account-dev:cicd',
      validate: (value) => /^.+:.+$/.test(value),
    },
    {
      name: 'prodBuildkiteQueueName',
      message: 'Prod Buildkite queue',
      initial: 'my-team-aws-account-prod:cicd',
      validate: (value) => /^.+:.+$/.test(value),
    },
    {
      name: 'devDataDogApiKeySecretArn',
      message: 'Dev DataDog API Key Secret ARN',
      initial:
        'arn:aws:secretsmanager:<Region>:<AccountId>:secret:datadog-api-key',
    },
    {
      name: 'prodDataDogApiKeySecretArn',
      message: 'Prod DataDog API Key Secret ARN',
      initial:
        'arn:aws:secretsmanager:<Region>:<AccountId>:secret:datadog-api-key',
    },
  ],
  packageManager: 'pnpm',
  type: 'application',
};
