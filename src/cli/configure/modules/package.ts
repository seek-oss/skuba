import { getSkubaVersion } from '../../../utils/version';
import { deleteFiles } from '../processing/deleteFiles';
import { withPackage } from '../processing/package';
import { merge } from '../processing/record';
import { Module, Options } from '../types';

const DEFAULT_PACKAGE_FILES = [
  'lib*/**/*.d.ts',
  'lib*/**/*.js',
  'lib*/**/*.js.map',
];

export const packageModule = async ({
  entryPoint,
  type,
}: Options): Promise<Module> => {
  const version = await getSkubaVersion();

  const initialData = {
    private: type !== 'package',

    scripts: {
      build: type === 'package' ? 'skuba build-package' : 'skuba build',
      format: 'skuba format',
      lint: 'skuba lint',
      ...(type === 'package' ? {} : { start: 'ENVIRONMENT=local skuba start' }),
      test: 'skuba test',
    },
    skuba: {
      entryPoint,
      template: null,
      type,
      version,
    },
  };

  const recurringData = {
    devDependencies: {
      skuba: version,
    },
    skuba: {
      entryPoint,
      type,
      version,
    },
  };

  return {
    ...deleteFiles('.npmignore'),

    'package.json': withPackage((inputData) => {
      const outputData = merge(
        inputData,
        'skuba' in inputData ? recurringData : initialData,
      );

      outputData.license = outputData.license ?? 'UNLICENSED';

      if (type === 'package') {
        outputData.files = (
          outputData.files ?? DEFAULT_PACKAGE_FILES
        ).flatMap((filePattern) =>
          filePattern === 'lib' ? DEFAULT_PACKAGE_FILES : [filePattern],
        );

        outputData.version =
          outputData.version ?? '0.0.0-semantically-released';

        outputData.scripts = outputData.scripts ?? {};

        // User-defined pre- and post-scripts are confusing and dropped by e.g.
        // Yarn 2.
        outputData.scripts.release = [
          outputData.scripts.prepublish,
          outputData.scripts.prerelease,
          outputData.scripts.release ?? 'skuba release',
        ]
          .filter((script): script is string => typeof script === 'string')
          .map((script) =>
            script
              .replace(/^smt build$/, 'yarn build')
              .replace(/^smt /, 'skuba ')
              .trim(),
          )
          .filter(Boolean)
          .join(' && ');

        // Align with the required syntax for package.json#/paths
        if (outputData.scripts.build === 'skuba build-package') {
          outputData.main = './lib-commonjs/index.js';
          outputData.module = './lib-es2015/index.js';
          outputData.types = './lib-types/index.d.ts';
        } else {
          outputData.main = './lib/index.js';
          outputData.module = './lib/index.js';
          outputData.types = './lib/index.d.ts';
        }

        delete outputData.scripts.commit;
        delete outputData.scripts['format:check'];
        delete outputData.scripts.prepublish;
        delete outputData.scripts.prerelease;
        delete outputData.typings;
      }

      return outputData;
    }),
  };
};
