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
      name: 'description',
      message: 'Description',
      initial: 'A project just for me',
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
  ],
  type: 'application',
};
