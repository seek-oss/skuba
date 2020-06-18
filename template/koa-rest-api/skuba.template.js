/**
 * Run `skuba configure` to finish templating and remove this file.
 */

module.exports = {
  entryPoint: 'src/app.ts',
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
      name: 'devGantryEnvironmentName',
      message: 'Dev Gantry environment',
      initial: 'my-gantry-dev',
    },
    {
      name: 'prodGantryEnvironmentName',
      message: 'Prod Gantry environment',
      initial: 'my-gantry-prod',
    },
    {
      name: 'prodAwsAccountId',
      message: 'Prod AWS account',
      initial: '123456789012',
      validate: (value) => /^\d{12}$/.test(value),
    },
  ],
  type: 'application',
};
