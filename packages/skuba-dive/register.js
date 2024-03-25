/**
 * @see {@link https://nodejs.org/api/deprecations.html#DEP0144}
 */
const [firstModuleParent] = Object.values(require.cache).filter((m) =>
  m.children.includes(module),
);

if (typeof firstModuleParent !== 'undefined') {
  const { addAlias } = require('module-alias');

  addAlias('src', firstModuleParent.path);
}
