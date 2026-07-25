import { styleText } from 'node:util';

import { hasDebugFlag } from '../../utils/args.ts';
import { log } from '../../utils/logging.ts';
import { getManifestProperties } from '../../utils/manifest.ts';

import { copyAssets } from './assets.ts';
import { type EsbuildConfig, esbuild } from './esbuild.ts';
import { rolldown } from './rolldown.ts';
import { readTsBuildConfig, tsc } from './tsc.ts';

export const build = async (args = process.argv.slice(2)) => {
  // TODO: define a unified `package.json#/skuba` schema and parser so we don't
  // need all these messy lookups.
  const manifest = await getManifestProperties('build');

  switch (manifest?.value) {
    case 'esbuild': {
      const debug = hasDebugFlag(args);
      const esbuildConfig = await getManifestProperties<
        'esbuildConfig',
        EsbuildConfig
      >('esbuildConfig');

      log.plain(styleText('yellow', 'esbuild'));
      await esbuild(
        {
          debug,
          type: manifest.type,
          ...esbuildConfig?.value,
        },
        args,
      );
      break;
    }

    case 'rolldown': {
      log.plain(styleText('magenta', 'rolldown'));
      await rolldown(args);
      break;
    }

    // TODO: flip the default case over to `rolldown` in skuba vNext.
    case undefined:
    case 'tsc': {
      log.plain(styleText('blue', 'tsc'));
      await tsc(args);
      break;
    }

    default: {
      log.err(
        'We don’t support the build tool specified in your',
        log.bold('package.json'),
        'yet:',
      );
      log.err(
        log.subtle(
          JSON.stringify({ skuba: { build: manifest?.value } }, null, 2),
        ),
      );
      process.exitCode = 1;
      return;
    }
  }

  const parsedCommandLine = readTsBuildConfig(args, log);

  if (!parsedCommandLine || process.exitCode) {
    return;
  }

  const { options: compilerOptions } = parsedCommandLine;

  if (!compilerOptions.outDir) {
    return;
  }

  await copyAssets(compilerOptions.outDir);
};
