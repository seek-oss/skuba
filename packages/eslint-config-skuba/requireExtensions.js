const { existsSync, lstatSync } = require('fs');
const { dirname, resolve } = require('path');

// Helper function to create rule listeners
function createRuleListener(context, check) {
  return {
    DeclareExportDeclaration: (node) => processNode(node, context, check),
    DeclareExportAllDeclaration: (node) => processNode(node, context, check),
    ExportAllDeclaration: (node) => processNode(node, context, check),
    ExportNamedDeclaration: (node) => processNode(node, context, check),
    ImportDeclaration: (node) => processNode(node, context, check),
  };
}

function extractPaths(inputPath) {
  // Find all matches of '/src/' and their positions
  const matches = [...inputPath.matchAll(/\/src\//g)];

  if (matches.length === 0) {
    return [process.cwd()]; // No '/src/' found in path, fallback to process.cwd()
  }

  const firstIndex = matches[0].index;
  const lastIndex = matches[matches.length - 1].index;

  return [
    inputPath.substring(0, firstIndex + 1),
    inputPath.substring(0, lastIndex + 1),
  ];
}

function processNode(node, context, check) {
  const source = node.source;
  if (!source) {
    return;
  }
  const value = source.value.replace(/\?.*$/, '');
  if (!value || value.endsWith('.js')) {
    return;
  }

  if (value.startsWith('.')) {
    // Relative import, check if it ends with .js
    return check(context, node, resolve(dirname(context.getFilename()), value));
  }

  if (value.startsWith('src')) {
    const file = dirname(context.getFilename());
    const paths = extractPaths(file);
    paths.forEach((path) => {
      check(context, node, resolve(path, value));
    });
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
          if (!existsSync(path)) {
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
          if (existsSync(path) && lstatSync(path).isDirectory()) {
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
