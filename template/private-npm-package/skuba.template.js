/**
 * Run `skuba configure` to finish templating and remove this file.
 */

module.exports = {
  entryPoint: 'src/index.ts',
  fields: [
    {
      name: 'moduleName',
      message: 'Module name',
      initial: '@seek/my-first-module',
      validate: (value) =>
        /^@seek\/.+$/.test(value) || 'must start with an @seek/ scope',
    },
    {
      name: 'description',
      message: 'Description',
      initial: 'This is my first module',
    },
  ],
  // `moduleName` is required for a valid `package.json`
  noSkip: true,
  packageManager: 'pnpm',
  type: 'package',
};
