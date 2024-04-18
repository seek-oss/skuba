/**
 * Run `skuba configure` to finish templating and remove this file.
 */

module.exports = {
  entryPoint: 'src/app.ts',
  fields: [
    {
      name: 'prodBuildkiteQueueName',
      message: 'Prod Buildkite queue',
      initial: 'my-team-aws-account-prod:cicd',
      validate: (value) => /^.+:.+$/.test(value),
    },
  ],
  packageManager: 'pnpm',
  type: 'application',
};
