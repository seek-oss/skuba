const { existsSync, lstatSync } = require('fs');
const { dirname, resolve, join } = require('path');

// Per-ESLint instance caches using WeakMaps keyed by context
const pathCaches = new WeakMap();
const fsCaches = new WeakMap();
const lstatCaches = new WeakMap();

// Cache size limits to prevent memory leaks in long-lived contexts (e.g., VSCode ESLint extension)
const CACHE_SIZE_LIMIT = 1000;

// Helper function to get or create cache for a context
function getCache(cacheMap, context) {
  if (!cacheMap.has(context)) {
    cacheMap.set(context, new Map());
  }
  return cacheMap.get(context);
}

// Helper function to manage cache size
function manageCacheSize(cache) {
  if (cache.size > CACHE_SIZE_LIMIT) {
    // Clear oldest half of entries
    const entries = Array.from(cache.entries());
    cache.clear();
    entries.slice(Math.floor(entries.length / 2)).forEach(([key, value]) => {
      cache.set(key, value);
    });
  }
}

// Helper function to resolve paths with caching
function resolvePath(context, basePath, relativePath) {
  const pathCache = getCache(pathCaches, context);
  const key = `${basePath}:${relativePath}`;

  if (pathCache.has(key)) {
    return pathCache.get(key);
  }

  const resolved = resolve(basePath, relativePath);
  pathCache.set(key, resolved);
  manageCacheSize(pathCache);
  return resolved;
}

// Helper function for cached filesystem checks
function cachedExistsSync(context, path) {
  const fsCache = getCache(fsCaches, context);

  if (fsCache.has(path)) {
    return fsCache.get(path);
  }

  const exists = existsSync(path);
  fsCache.set(path, exists);
  manageCacheSize(fsCache);
  return exists;
}

// Helper function for cached lstat checks
function cachedLstatSync(context, path) {
  const lstatCache = getCache(lstatCaches, context);

  if (lstatCache.has(path)) {
    return lstatCache.get(path);
  }

  try {
    const stats = lstatSync(path);
    lstatCache.set(path, stats);
    manageCacheSize(lstatCache);
    return stats;
  } catch {
    lstatCache.set(path, null);
    manageCacheSize(lstatCache);
    return null;
  }
}

// Helper function to create rule listeners
function createRuleListener(context, check) {
  return {
    DeclareExportDeclaration: (node) => processNode(node, context, check),
    DeclareExportAllDeclaration: (node) => processNode(node, context, check),
    ExportAllDeclaration: (node) => processNode(node, context, check),
    ExportNamedDeclaration: (node) => processNode(node, context, check),
    ImportDeclaration: (node) => processNode(node, context, check),
    ImportExpression: (node) => processNode(node, context, check),
  };
}

function processNode(node, context, check) {
  const source = node.source;
  if (!source) {
    return;
  }

  // For dynamic imports, ensure the source is a literal
  if (node.type === 'ImportExpression' && source.type !== 'Literal') {
    return;
  }

  const value = source.value.replace(/\?.*$/, '');
  if (!value || value.endsWith('.js')) {
    return;
  }

  if (value.startsWith('.')) {
    // Relative import, check if it ends with .js
    return check(
      context,
      node,
      resolvePath(context, dirname(context.getFilename()), value),
    );
  }

  if (value.startsWith('src')) {
    const file = dirname(context.getFilename());
    const leadingPathToSrc = file.split('/src/')[0];
    return check(context, node, join(leadingPathToSrc, value));
  }
}

// Define the plugin with flat config format
const requireExtensionsPlugin = {
  name: 'require-extensions',
  rules: {
    'require-extensions': {
      meta: {
        fixable: true,
      },
      create(context) {
        return createRuleListener(context, (ctx, node, path) => {
          if (
            cachedExistsSync(ctx, `${path}.ts`) ||
            !cachedExistsSync(ctx, path)
          ) {
            let fix;
            if (!node.source.value.includes('?')) {
              fix = (fixer) => {
                return fixer.replaceText(
                  node.source,
                  `'${node.source.value}.js'`,
                );
              };
            }

            ctx.report({
              node,
              message: 'Relative imports and exports must end with .js',
              fix,
            });
          }
        });
      },
    },
    'require-index': {
      meta: {
        fixable: true,
      },
      create(context) {
        return createRuleListener(context, (ctx, node, path) => {
          if (cachedLstatSync(ctx, path)?.isDirectory()) {
            ctx.report({
              node,
              message: 'Directory paths must end with index.js',
              fix(fixer) {
                return fixer.replaceText(
                  node.source,
                  `'${node.source.value}/index.js'`,
                );
              },
            });
          }
        });
      },
    },
  },
};

// Config export with flat config format
module.exports = {
  plugin: requireExtensionsPlugin,
  configs: {
    recommended: [
      {
        plugins: {
          'require-extensions': requireExtensionsPlugin,
        },
        rules: {
          'require-extensions/require-extensions': 'error',
          'require-extensions/require-index': 'error',
        },
      },
    ],
  },
};
