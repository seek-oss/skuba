import { inspect } from 'util';

import { type Edit, parseAsync } from '@ast-grep/napi';
import fg from 'fast-glob';
import fs from 'fs-extra';

import { log } from '../../../utils/logging.js';
import { getCustomConditions } from '../../build/tsc.js';
import { registerAstGrepLanguages } from '../../lint/internalLints/registerAstGrepLanguages.js';
import type { PatchFunction } from '../../lint/internalLints/upgrade/index.js';

const migrateCdkLambdas = async (
  tsFiles: Array<{ file: string; contents: string }>,
  containsDatadogLambdaImport: boolean,
) =>
  (
    await Promise.all(
      tsFiles.map(async ({ file, contents }) => {
        if (!contents.includes('NodejsFunction')) {
          return null;
        }

        const edits: Edit[] = [];

        const astRoot = (await parseAsync('TypeScript', contents)).root();

        const workerAst = astRoot.find({
          rule: {
            kind: 'new_expression',
            regex: '^new (aws_lambda_nodejs.NodejsFunction|NodejsFunction)',
          },
        });

        if (!workerAst) {
          return null;
        }

        const bundlingObject = workerAst.find({
          rule: {
            kind: 'object',
            inside: {
              kind: 'pair',
              regex: '^bundling',
            },
          },
        });

        if (!bundlingObject) {
          return null;
        }

        const format = bundlingObject.find({
          rule: {
            kind: 'pair',
            regex: '^format',
          },
        });

        const containsAwsLambdaNodeJsImport = astRoot.find({
          rule: {
            kind: 'import_specifier',
            regex: 'aws_lambda_nodejs',
          },
        });

        if (!format) {
          edits.push({
            startPos: bundlingObject.range().end.index - 1,
            endPos: bundlingObject.range().end.index - 1,
            insertedText: `\nformat: ${containsAwsLambdaNodeJsImport ? 'aws_lambda_nodejs.' : ''}OutputFormat.ESM,\n`,
          });
          if (!containsAwsLambdaNodeJsImport) {
            const lastImport = astRoot.find({
              rule: {
                kind: 'import_statement',
                inside: {
                  kind: 'program',
                },
                nthChild: {
                  ofRule: {
                    kind: 'import_statement',
                  },
                  position: 1,
                  reverse: true,
                },
              },
            });

            const insertPos = lastImport
              ? lastImport.range().end.index
              : astRoot.range().start.index;

            edits.push({
              startPos: insertPos,
              endPos: insertPos,
              insertedText:
                "import { OutputFormat } from 'aws-cdk-lib/aws-lambda-nodejs';\n",
            });
          }
        } else {
          edits.push(format.replace(format.text().replace('CJS', 'ESM')));
        }

        const mainFields = bundlingObject.find({
          rule: {
            kind: 'pair',
            regex: '^mainFields',
          },
        });

        if (!mainFields) {
          edits.push({
            startPos: bundlingObject.range().end.index - 1,
            endPos: bundlingObject.range().end.index - 1,
            insertedText: "\nmainFields: ['module', 'main'],\n",
          });
        } else {
          edits.push(mainFields.replace("mainFields: ['module', 'main']"));
        }

        const nodeModules = bundlingObject.find({
          rule: {
            kind: 'pair',
            regex: '^nodeModules',
          },
        });

        if (!nodeModules) {
          edits.push({
            startPos: bundlingObject.range().end.index - 1,
            endPos: bundlingObject.range().end.index - 1,
            insertedText: "\nnodeModules: ['pino'],\n",
          });
        } else {
          const nodeModulesArray = nodeModules.find({
            rule: {
              kind: 'array',
            },
          });

          if (nodeModulesArray && !nodeModules.text().includes('pino')) {
            edits.push({
              startPos: nodeModulesArray.range().end.index - 1,
              endPos: nodeModulesArray.range().end.index - 1,
              insertedText: `${nodeModules.text().includes('[') ? ',' : ''} 'pino'`,
            });
          }
        }

        const esbuildArgs = bundlingObject.find({
          rule: {
            kind: 'pair',
            regex: '^esbuildArgs',
          },
        });

        if (!esbuildArgs) {
          const customCondition = getCustomConditions();
          edits.push({
            startPos: bundlingObject.range().end.index - 1,
            endPos: bundlingObject.range().end.index - 1,
            insertedText: `\nesbuildArgs: {\n  '--conditions': '${customCondition.join(',')},module',\n},\n`,
          });
        } else {
          const conditions = esbuildArgs.find({
            rule: {
              kind: 'pair',
              regex: "^'--conditions'",
            },
          });

          if (!conditions) {
            const customCondition = getCustomConditions();
            edits.push({
              startPos: esbuildArgs.range().end.index - 1,
              endPos: esbuildArgs.range().end.index - 1,
              insertedText: `\n'--conditions': '${customCondition.join(',')},module',\n`,
            });
          } else {
            const conditionsValue = conditions.field('value');
            if (conditionsValue && !conditionsValue.text().includes('module')) {
              edits.push({
                startPos: conditionsValue.range().end.index - 1,
                endPos: conditionsValue.range().end.index - 1,
                insertedText: ',module',
              });
            }
          }

          const datadogSettings = astRoot.find({
            rule: {
              kind: 'object',
              inside: {
                kind: 'arguments',
                inside: {
                  kind: 'new_expression',
                  regex: '^new DatadogLambda',
                },
              },
            },
          });

          const nodeLayerVersion = datadogSettings?.find({
            rule: {
              kind: 'pair',
              regex: '^nodeLayerVersion',
            },
          });

          const redirectHandler = datadogSettings?.find({
            rule: {
              kind: 'pair',
              regex: '^redirectHandler',
            },
          });

          if (datadogSettings && !nodeLayerVersion && !redirectHandler) {
            if (containsDatadogLambdaImport) {
              edits.push({
                startPos: datadogSettings.range().end.index - 1,
                endPos: datadogSettings.range().end.index - 1,
                insertedText: '\nredirectHandler: false,\n',
              });
            } else {
              const extensionVersion = datadogSettings.find({
                rule: {
                  kind: 'lexical_declaration',
                  regex: '^const DATADOG_EXTENSION_LAYER_VERSION ',
                },
              });

              const lastImport = astRoot.find({
                rule: {
                  kind: 'import_statement',
                  inside: {
                    kind: 'program',
                  },
                  nthChild: {
                    ofRule: {
                      kind: 'import_statement',
                    },
                    position: 1,
                    reverse: true,
                  },
                },
              });

              const insertPos =
                extensionVersion?.range().end.index ??
                lastImport?.range().end.index ??
                astRoot.range().start.index;

              edits.push({
                startPos: insertPos,
                endPos: insertPos,
                insertedText: 'const DATADOG_NODE_LAYER_VERSION = 126;\n',
              });

              edits.push({
                startPos: datadogSettings.range().end.index - 1,
                endPos: datadogSettings.range().end.index - 1,
                insertedText:
                  '\nnodeLayerVersion: DATADOG_NODE_LAYER_VERSION,\n',
              });
            }
          }
        }

        if (!edits.length) {
          return null;
        }

        return {
          file,
          contents: astRoot.commitEdits(edits),
        };
      }),
    )
  ).filter((file) => file !== null);

const migrateServerlessLambdas = async (
  serverlessFiles: Array<{ file: string; contents: string }>,
  containsDatadogLambdaImport: boolean,
) => {
  registerAstGrepLanguages();
  return (
    await Promise.all(
      serverlessFiles.map(async ({ file, contents }) => {
        const astRoot = (await parseAsync('yaml', contents)).root();

        const edits: Edit[] = [];
        const datadogSettings = astRoot.find({
          rule: {
            kind: 'block_node',
            inside: {
              kind: 'block_mapping_pair',
              regex: '^datadog:',
            },
          },
        });

        if (datadogSettings) {
          const addLayers = datadogSettings.find({
            rule: {
              kind: 'block_mapping_pair',
              regex: '^addLayers:',
            },
          });

          const addLayersDisabled = addLayers?.text().includes('false');

          if (addLayersDisabled) {
            const redirectHandlers = datadogSettings.find({
              rule: {
                kind: 'block_node',
                inside: {
                  kind: 'block_mapping_pair',
                  regex: '^redirectHandlers:',
                },
              },
            });

            if (!redirectHandlers) {
              const indent = datadogSettings.range().start.column;
              edits.push({
                startPos: datadogSettings.range().end.index,
                endPos: datadogSettings.range().end.index,
                insertedText: `\n${' '.repeat(indent)}redirectHandlers: false${!containsDatadogLambdaImport ? ' # TODO: Wrap your handler with the `datadog` function wrapper from `datadog-lambda-js` or the `withLambdaExtension` function wrapper from `seek-datadog-custom-metrics/lambda`. Alternatively, remove this setting and enable addLayers: true' : ''}\n`,
              });
            }
          }
        }

        if (!contents.includes('esbuild')) {
          if (edits.length === 0) {
            return null;
          }
          return {
            contents: astRoot.commitEdits(edits),
            file,
          };
        }

        const esbuildAst = astRoot.find({
          rule: {
            kind: 'block_node',
            inside: {
              kind: 'block_mapping_pair',
              regex: '^esbuild:',
            },
          },
        });

        if (!esbuildAst) {
          return null;
        }

        const conditions = esbuildAst.find({
          rule: {
            kind: 'block_node',
            inside: {
              kind: 'block_mapping_pair',
              regex: '^conditions:',
            },
          },
        });

        if (conditions) {
          const indent = conditions.range().start.column;
          edits.push({
            startPos: conditions.range().end.index,
            endPos: conditions.range().end.index,
            insertedText: `\n${' '.repeat(indent)}- module`,
          });
        } else {
          const indent = esbuildAst.range().start.column;
          edits.push({
            startPos: esbuildAst.range().end.index,
            endPos: esbuildAst.range().end.index,
            insertedText: `\n${' '.repeat(indent)}conditions:\n${' '.repeat(
              indent + 2,
            )}- module\n`,
          });
        }

        const external = esbuildAst.find({
          rule: {
            kind: 'block_node',
            inside: {
              kind: 'block_mapping_pair',
              regex: '^external:',
            },
          },
        });

        if (external) {
          const indent = external.range().start.column;
          if (!external.text().includes('pino')) {
            edits.push({
              startPos: external.range().start.index,
              endPos: external.range().start.index,
              insertedText: `- pino\n${' '.repeat(indent)}`,
            });
          }
        } else {
          const indent = esbuildAst.range().start.column;
          edits.push({
            startPos: esbuildAst.range().end.index,
            endPos: esbuildAst.range().end.index,
            insertedText: `\n${' '.repeat(indent)}external:\n${' '.repeat(
              indent + 2,
            )}- pino\n`,
          });
        }

        const mainFields = esbuildAst.find({
          rule: {
            kind: 'block_node',
            inside: {
              kind: 'block_mapping_pair',
              regex: '^mainFields:',
            },
          },
        });

        if (!mainFields) {
          const indent = esbuildAst.range().start.column;
          edits.push({
            startPos: esbuildAst.range().end.index,
            endPos: esbuildAst.range().end.index,
            insertedText: `\n${' '.repeat(indent)}mainFields:\n${' '.repeat(
              indent + 2,
            )}- module\n${' '.repeat(indent + 2)}- main\n`,
          });
        } else {
          edits.push(mainFields.replace('mainFields:\n  - module\n  - main\n'));
        }

        if (edits.length === 0) {
          return null;
        }

        return {
          file,
          contents: astRoot.commitEdits(edits),
        };
      }),
    )
  ).filter((file) => file !== null);
};

export const migrateLambdas: PatchFunction = async ({ mode }) => {
  const [tsFilePaths, serverlessFilePaths] = await Promise.all([
    fg(['**/*.ts'], {
      ignore: ['**/.git', '**/node_modules'],
    }),
    fg(['**/serverless*.{yml,yaml}'], {
      ignore: ['**/.git', '**/node_modules'],
    }),
  ]);

  const [tsFiles, serverlessFiles] = await Promise.all([
    Promise.all(
      tsFilePaths.map(async (file) => {
        const contents = await fs.promises.readFile(file, 'utf8');

        return {
          file,
          contents,
        };
      }),
    ),
    Promise.all(
      serverlessFilePaths.map(async (file) => {
        const contents = await fs.promises.readFile(file, 'utf8');

        return {
          file,
          contents,
        };
      }),
    ),
  ]);

  const containsDatadogLambdaImport = tsFiles.some(
    ({ contents }) =>
      contents.includes('datadog-lambda-js') ||
      contents.includes('withLambdaExtension'),
  );

  const [patchedTsFiles, patchedServerlessFiles] = await Promise.all([
    migrateCdkLambdas(tsFiles, containsDatadogLambdaImport),
    migrateServerlessLambdas(serverlessFiles, containsDatadogLambdaImport),
  ]);

  if (!patchedTsFiles.length && !patchedServerlessFiles.length) {
    return {
      result: 'skip',
      reason: 'no lambdas to migrate',
    };
  }

  if (mode === 'lint') {
    return {
      result: 'apply',
    };
  }

  await Promise.all(
    [...patchedTsFiles, ...patchedServerlessFiles].map(
      async ({ file, contents }) => {
        await fs.promises.writeFile(file, contents, 'utf8');
      },
    ),
  );

  return {
    result: 'apply',
  };
};

export const tryMigrateLambdas: PatchFunction = async (opts) => {
  try {
    return await migrateLambdas(opts);
  } catch (err) {
    // Don't fail the entire lint/format if this fails since it's a non-critical part of the upgrade
    // and can be retried later by the user
    log.warn('Failed to migrate lambdas, skipping');
    log.subtle(inspect(err));
    return { result: 'skip', reason: 'due to an error' };
  }
};
