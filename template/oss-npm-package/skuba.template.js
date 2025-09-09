/**
 * Run `skuba configure` to finish templating and remove this file.
 */

odule.exports = {
  entryPoint: 'src/index.ts',
  fields: [
    {
      name: 'moduleName',
      message: 'Module name',
      initial: 'my-first-module',
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
