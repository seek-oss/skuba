import { dirname } from 'path';
import { inspect } from 'util';

import fg from 'fast-glob';
import fs from 'fs-extra';

import { createExec } from '../../../utils/exec.js';
import { log } from '../../../utils/logging.js';
import { getConsumerManifest } from '../../../utils/manifest.js';
import type { PatchFunction } from '../../lint/internalLints/upgrade/index.js';

export const patchInstrumentation: PatchFunction = async ({
  mode,
  packageManager,
}) => {
  const [dockerfilePaths, tsPaths] = await Promise.all([
    fg(['**/Dockerfile*'], {
      ignore: ['**/.git', '**/node_modules'],
    }),
    fg(['**/*.ts'], {
      ignore: ['**/.git', '**/node_modules'],
    }),
  ]);

  if (!dockerfilePaths.length) {
    return {
      result: 'skip',
      reason: 'no Dockerfile files found',
    };
  }

  const [dockerFiles, tsFiles] = await Promise.all([
    Promise.all(
      dockerfilePaths.map(async (filePath) => ({
        filePath,
        content: await fs.promises.readFile(filePath, 'utf-8'),
      })),
    ),
    Promise.all(
      tsPaths.map(async (filePath) => ({
        filePath,
        content: await fs.promises.readFile(filePath, 'utf-8'),
      })),
    ),
  ]);

  const hasDDTraceImport = tsFiles.some(({ content }) =>
    /from\s+['"]dd-trace['"]/.test(content),
  );
  const otelImports = tsFiles.filter(({ content }) =>
    /from\s+['"]@opentelemetry\/api['"]/.test(content),
  );

  const hasOpenTelemetryImport = otelImports.length > 0;

  if (!hasDDTraceImport && !hasOpenTelemetryImport) {
    return {
      result: 'skip',
      reason:
        'no imports for Datadog or OpenTelemetry instrumentation found in source files',
    };
  }

  const confused = hasDDTraceImport && hasOpenTelemetryImport;

  if (confused) {
    log.warn(
      'Found imports for both Datadog and OpenTelemetry instrumentation in source files, unsure which to patch',
    );
  }

  const warning =
    hasDDTraceImport && hasOpenTelemetryImport
      ? 'TODO: skuba failed to determine whether to add dd-trace or OpenTelemetry flags, please choose the appropriate flags to add to your Dockerfile '
      : '';

  const commandsToAdd = [
    hasDDTraceImport ? '--import dd-trace/initialize.mjs' : '',
    hasOpenTelemetryImport
      ? '--experimental-loader @opentelemetry/instrumentation/hook.mjs'
      : '',
  ].filter(Boolean);

  const patched = dockerFiles
    .map(({ filePath, content }) => {
      if (filePath.includes('dev-deps')) {
        return null;
      }

      const cmd = /^CMD\s+(.+)$/m.exec(content)?.[1];

      if (!cmd) {
        return null;
      }

      // check if CMD is in shell or exec form
      const isShellForm = !cmd.startsWith('[');

      if (isShellForm) {
        if (cmd.startsWith('node ')) {
          const patchedCmd = cmd.replace(
            'node ',
            `node ${warning}${commandsToAdd.join(' ')} `,
          );
          return { filePath, content: content.replace(cmd, patchedCmd) };
        }

        return {
          filePath,
          content: content.replace(
            cmd,
            `${warning}${commandsToAdd.join(' ')} ${cmd}`,
          ),
        };
      }

      const flags = commandsToAdd
        .map((f) => f.split(' '))
        .flat()
        .map((f) => `"${f}"`)
        .join(', ');

      if (/^\s*\[\s*"node"\s*[,\]]/.test(cmd)) {
        const patchedCmd = cmd.replace(
          /^(\s*\[\s*"node"\s*)([,\]])/,
          `$1, ${warning}${flags}$2`,
        );

        return { filePath, content: content.replace(cmd, patchedCmd) };
      }

      const patchedCmd = cmd.replace(/^\s*\[/, `[${warning}${flags}, `);
      return { filePath, content: content.replace(cmd, patchedCmd) };
    })
    .filter((patch) => patch !== null);

  if (!patched.length) {
    return {
      result: 'skip',
      reason: 'no CMD instructions found in Dockerfiles to patch',
    };
  }

  if (mode === 'lint') {
    return {
      result: 'apply',
    };
  }

  if (hasOpenTelemetryImport) {
    const packageJsons = await Promise.all(
      otelImports.map(async ({ filePath }) =>
        getConsumerManifest(dirname(filePath)),
      ),
    );

    await Promise.all(
      packageJsons
        .filter((pkg) => pkg !== undefined)
        .map(async (pkg) => {
          const { packageJson, path } = pkg;

          if (
            packageJson.dependencies?.['@opentelemetry/instrumentation'] ||
            packageJson.devDependencies?.['@opentelemetry/instrumentation']
          ) {
            return;
          }

          const folderExec = createExec({ cwd: dirname(path) });
          if (packageManager.command === 'pnpm') {
            return folderExec(
              'pnpm',
              'install',
              '@opentelemetry/instrumentation@0.216.0',
              '--prefer-offline',
              '--ignore-workspace-root-check',
            );
          }
          return folderExec(
            'yarn',
            'add',
            '@opentelemetry/instrumentation@0.216.0',
            '--prefer-offline',
          );
        }),
    );
  }

  await Promise.all(
    patched.map(({ filePath, content }) =>
      fs.promises.writeFile(filePath, content, 'utf-8'),
    ),
  );

  return {
    result: 'apply',
  };
};

export const tryPatchInstrumentation: PatchFunction = async (opts) => {
  try {
    return await patchInstrumentation(opts);
  } catch (err) {
    log.warn(
      'Failed to patch Datadog or OpenTelemetry instrumentation, skipping',
    );
    log.subtle(inspect(err));
    return { result: 'skip', reason: 'due to an error' };
  }
};
