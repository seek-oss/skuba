import { inspect } from 'util';

import { glob } from 'fast-glob';
import fs from 'fs-extra';
import { z } from 'zod';

import { Git } from '../../../../../../index.js';
import { log } from '../../../../../../utils/logging.js';
import type { PatchFunction, PatchReturnType } from '../../index.js';

const packageJsonSchema = z
  .object({
    imports: z.record(z.record(z.string())).optional(),
  })
  .passthrough();

const tsConfigSchema = z
  .object({
    compilerOptions: z
      .object({
        customConditions: z.array(z.string()).optional(),
        rootDir: z.string().optional(),
        paths: z.record(z.unknown()).optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();

const getRepoName = async (): Promise<string | undefined> => {
  try {
    const dir = process.cwd();
    const { repo } = await Git.getOwnerAndRepo({ dir });

    return repo;
  } catch (error) {
    log.warn(`Error getting repository information: ${String(error)}`);
    throw error;
  }
};

const fetchFiles = async (files: string[]) =>
  Promise.all(
    files.map(async (file) => {
      const contents = await fs.promises.readFile(file, 'utf8');

      return {
        file,
        contents,
      };
    }),
  );

const formatModuleNameMapper = (subfolderPaths: string[]) =>
  subfolderPaths.map((subfolderPath) => `<rootDir>/${subfolderPath}/src`);

const isTypeScriptJestConfig = (contents: string): boolean =>
  contents.includes('Jest.mergePreset') ||
  contents.includes('export default') ||
  contents.includes('import');

const addModuleNameMapperToTypeScript = (
  contents: string,
  moduleNameMapper: Record<string, unknown>,
): string => {
  const moduleNameMapperStr = JSON.stringify(moduleNameMapper, null, 2)
    .split('\n')
    .map((line, index) => (index === 0 ? line : `  ${line}`))
    .join('\n');

  const mergePresetRegex = /(Jest\.mergePreset\(\s*\{)/;
  const match = mergePresetRegex.exec(contents);

  if (match?.index !== undefined) {
    const insertIndex = match.index + match[0].length;
    const before = contents.slice(0, insertIndex);
    const after = contents.slice(insertIndex);

    return `${before}\n  moduleNameMapper: ${moduleNameMapperStr},${after}`;
  }

  return contents;
};

export const addJestModuleNameMapper = (
  contents: string,
  subfolderPaths: string[],
) => {
  const formattedNames = formatModuleNameMapper(subfolderPaths);
  const formattedNamesWithPath = formattedNames.map((name) => `${name}/$1`);

  const moduleNameMapper = {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^#src$': formattedNames,
    '^#src/(.*)\\.js$': formattedNamesWithPath,
    '^#src\/(.*)$': formattedNamesWithPath,
  };

  if (isTypeScriptJestConfig(contents)) {
    return addModuleNameMapperToTypeScript(contents, moduleNameMapper);
  }

  try {
    const parseResult = packageJsonSchema.safeParse(JSON.parse(contents));

    if (!parseResult.success) {
      log.warn(
        `Failed to parse Jest config as JSON: ${parseResult.error.message}`,
      );
      return contents;
    }

    const jestConfig = parseResult.data;
    jestConfig.moduleNameMapper = moduleNameMapper;

    return JSON.stringify(jestConfig, null, 2);
  } catch (error) {
    log.warn(`Failed to parse Jest config: ${String(error)}`);
    return contents;
  }
};

export const replacePackageJson = (contents: string, repoName: string) => {
  try {
    const parseResult = packageJsonSchema.safeParse(JSON.parse(contents));

    if (!parseResult.success) {
      log.warn(`Failed to parse package.json: ${parseResult.error.message}`);
      return contents;
    }

    const packageJson = parseResult.data;

    packageJson.imports = {
      '#src/*': {
        [`@seek/${repoName}/source`]: './src/*',
        default: './lib/*',
      },
    };

    return JSON.stringify(packageJson, null, 2);
  } catch (error) {
    log.warn(`Failed to parse package.json as JSON: ${String(error)}`);
    return contents;
  }
};

export const replaceTsconfig = (
  contents: string,
  repoName: string,
  isMonoRepo: boolean,
) => {
  try {
    const jsonWithNoComments = contents
      .replace(/\/\/.*|\/\*[\s\S]*?\*\//g, '')
      .trim();

    const parseResult = tsConfigSchema.safeParse(
      JSON.parse(jsonWithNoComments),
    );

    if (!parseResult.success) {
      log.warn(`Failed to parse tsconfig.json: ${parseResult.error.message}`);
      return contents;
    }

    const tsconfigJson = parseResult.data;

    if (
      typeof tsconfigJson.extends === 'string' &&
      !tsconfigJson.extends.startsWith('skuba/')
    ) {
      log.subtle(
        'Skipping tsconfig.json that does not extend skuba/config/tsconfig.json',
      );
      return contents;
    }

    if (
      !tsconfigJson.compilerOptions ||
      typeof tsconfigJson.compilerOptions !== 'object'
    ) {
      tsconfigJson.compilerOptions = {};
    }

    const compilerOptions = tsconfigJson.compilerOptions;

    if (compilerOptions.paths !== undefined && !isMonoRepo) {
      delete compilerOptions.paths;
    }

    compilerOptions.customConditions ??= [];

    if (compilerOptions.customConditions.includes(`@seek/${repoName}/source`)) {
      log.subtle(
        'Custom condition mapping already exists in tsconfig.json, skipping',
      );
      return contents;
    }

    compilerOptions.customConditions = [`@seek/${repoName}/source`];

    compilerOptions.rootDir ??= '.';

    return JSON.stringify(tsconfigJson, null, 2);
  } catch (error) {
    log.warn(`Failed to parse tsconfig.json as JSON: ${String(error)}`);
    return contents;
  }
};

export const tryConfigureTsConfigForESM: PatchFunction = async ({
  mode,
}): Promise<PatchReturnType> => {
  const packageJsonPatterns = ['**/package.*json'];
  const tsconfigJsonPatterns = ['**/tsconfig.*json'];
  const jestConfigPatterns = ['**/jest.config.*ts'];

  const globOptions = {
    ignore: ['**/node_modules/**', '**/tsconfig.build.json'],
  };

  const [packageJsonFiles, tsconfigJsonFiles, jestConfigFiles] =
    await Promise.all([
      fetchFiles(await glob(packageJsonPatterns, globOptions)),
      fetchFiles(await glob(tsconfigJsonPatterns, globOptions)),
      fetchFiles(await glob(jestConfigPatterns, globOptions)),
    ]);

  const subfolderPaths = packageJsonFiles
    .map(({ file }) => file.split('/').slice(0, -1).join('/'))
    .filter((path) => path !== '');

  const repoName = await getRepoName();
  if (!repoName) {
    return { result: 'skip', reason: 'no repository name found' };
  }

  const replacedPackageJsonFiles = packageJsonFiles.map(
    ({ file, contents }) => ({
      file,
      before: contents,
      after: replacePackageJson(contents, repoName),
    }),
  );

  const replacedTsconfigJsonFiles = tsconfigJsonFiles.map(
    ({ file, contents }) => ({
      file,
      before: contents,
      after: replaceTsconfig(contents, repoName, subfolderPaths.length > 0),
    }),
  );

  const replacedJestConfigFiles =
    subfolderPaths.length > 0
      ? jestConfigFiles.map(({ file, contents }) => ({
          file,
          before: contents,
          after: addJestModuleNameMapper(contents, subfolderPaths),
        }))
      : [];

  if (mode === 'lint') {
    return {
      result: 'apply',
    };
  }

  await Promise.all(
    [
      ...replacedPackageJsonFiles,
      ...replacedTsconfigJsonFiles.filter(
        ({ after }) => typeof after === 'string',
      ),
      ...replacedJestConfigFiles,
    ].map(async ({ file, after }) => {
      await fs.promises.writeFile(file, after);
    }),
  );

  return { result: 'apply' };
};

export const configureTsConfigForESM: PatchFunction = async (config) => {
  try {
    return await tryConfigureTsConfigForESM(config);
  } catch (err) {
    log.warn('Failed to write configure `tsconfig.json` and `package.json`');
    log.subtle(inspect(err));
    return { result: 'skip', reason: 'due to an error' };
  }
};
