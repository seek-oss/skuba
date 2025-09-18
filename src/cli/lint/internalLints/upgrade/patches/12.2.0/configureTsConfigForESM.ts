import path from 'path';
import { inspect } from 'util';

import { glob } from 'fast-glob';
import fs from 'fs-extra';
import * as z from 'zod';

import { Git } from '../../../../../../index.js';
import { log } from '../../../../../../utils/logging.js';
import type { PatchFunction, PatchReturnType } from '../../index.js';

const packageJsonSchema = z.looseObject({
  imports: z.record(z.string(), z.record(z.string(), z.string())).optional(),
});

type PackageJson = z.infer<typeof packageJsonSchema>;

const tsConfigSchema = z.looseObject({
  compilerOptions: z
    .looseObject({
      customConditions: z.array(z.string()).optional(),
      rootDir: z.string().optional(),
      paths: z
        .record(z.string(), z.union([z.array(z.string()), z.null()]))
        .optional(),
    })
    .optional(),
});

type TsConfig = z.infer<typeof tsConfigSchema>;

const fetchFiles = async (patterns: string[]) => {
  const files = await glob(patterns, {
    ignore: ['**/.git', '**/node_modules'],
  });

  return Promise.all(
    files.map(async (file) => {
      const contents = await fs.promises.readFile(file, 'utf8');

      return {
        file,
        contents,
      };
    }),
  );
};

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

export const parsePackageJson = (
  contents: string,
): {
  original: PackageJson;
  parsed: PackageJson;
} | null => {
  try {
    const parsedJson: unknown = JSON.parse(contents);
    return {
      original: parsedJson as PackageJson,
      parsed: packageJsonSchema.parse(parsedJson),
    };
  } catch (error) {
    log.warn(`Failed to parse package.json as JSON: ${String(error)}`);
    return null;
  }
};

export const updatePackageJson = ({
  parsed,
  customCondition,
}: {
  parsed: PackageJson;
  customCondition: string;
}) => {
  parsed.imports ??= {};
  parsed.imports[customCondition] ??= {
    types: './src/*',
    default: './lib/*',
  };

  return {
    parsed,
  };
};

const parseTsconfig = (
  contents: string,
): {
  original: TsConfig;
  parsed: TsConfig;
} | null => {
  try {
    const parsedJson: unknown = JSON.parse(contents);
    const tsconfig = tsConfigSchema.parse(parsedJson);

    return {
      original: parsedJson as TsConfig,
      parsed: tsconfig,
    };
  } catch (error) {
    log.warn(`Failed to parse root tsconfig.json as JSON: ${String(error)}`);
    return null;
  }
};

const updateTsConfig = ({
  parsed,
  customCondition,
  file,
}: {
  parsed: TsConfig;
  customCondition: string;
  file: string;
}) => {
  if (file === 'tsconfig.json') {
    parsed.compilerOptions ??= {};
    parsed.compilerOptions.customConditions ??= [];

    if (!parsed.compilerOptions.customConditions.includes(customCondition)) {
      parsed.compilerOptions.customConditions.push(customCondition);
    }
  }

  let srcPaths: string[] = [];
  ['./src/*', 'src/*', 'src'].forEach((key) => {
    if (parsed.compilerOptions?.paths?.[key]) {
      srcPaths = parsed.compilerOptions.paths[key];
      delete parsed.compilerOptions.paths[key];
    }
  });

  if (
    parsed.compilerOptions?.paths &&
    Object.keys(parsed.compilerOptions.paths).length === 0
  ) {
    delete parsed.compilerOptions.paths;
  }

  return {
    parsed,
    srcPaths,
  };
};

export const tryConfigureTsConfigForESM: PatchFunction = async ({
  mode,
}): Promise<PatchReturnType> => {
  let customCondition: string;
  try {
    const { repo } = await Git.getOwnerAndRepo({ dir: process.cwd() });
    customCondition = `@seek/${repo}/source`;
  } catch {
    return { result: 'skip', reason: 'no repository name found' };
  }

  const tsconfigJsonPatterns = ['**/tsconfig.json'];
  const tsconfigBuildJsonPatterns = ['**/tsconfig.build.json'];
  const tsconfigJsonFiles = await fetchFiles(tsconfigJsonPatterns);
  const tsconfigBuildJsonFiles = await fetchFiles(tsconfigBuildJsonPatterns);

  const parsedTsconfigFiles = tsconfigJsonFiles.flatMap(
    ({ file, contents }) => {
      const parsed = parseTsconfig(contents);
      return parsed ? [{ file, ...parsed }] : [];
    },
  );

  const parsedTsconfigBuildFiles = tsconfigBuildJsonFiles.flatMap(
    ({ file, contents }) => {
      const parsed = parseTsconfig(contents);
      return parsed ? [{ file, ...parsed }] : [];
    },
  );

  if (parsedTsconfigFiles.length === 0) {
    return { result: 'skip', reason: 'no valid tsconfig.json files found' };
  }

  const updatedTsconfigFiles = parsedTsconfigFiles.map(
    ({ file, parsed, original }) => ({
      file,
      original,
      ...updateTsConfig({ parsed, customCondition, file }),
    }),
  );

  const allSrcPaths = [
    ...new Set(
      updatedTsconfigFiles.flatMap(({ srcPaths, file }) =>
        srcPaths.flatMap((p) => {
          const regex = /(.*)src\/?\*?$/;
          const match = regex.exec(p);
          if (match?.[1] !== undefined) {
            return [path.join(path.dirname(file), match[1])];
          }

          log.warn(
            `Unexpected src path format in ${file}: ${p}. Expected format like "apps/api/src/*"`,
          );
          return [];
        }),
      ),
    ),
  ];

  // Fetch all package.json paths which may be in allSrcPaths
  const packageJsonPatterns = allSrcPaths.map((srcPath) =>
    path.join(srcPath, 'package.json'),
  );

  const packageJsonFiles = await fetchFiles(packageJsonPatterns);

  const parsedPackageJsonFiles = packageJsonFiles.flatMap(
    ({ file, contents }) => {
      const parsed = parsePackageJson(contents);
      return parsed ? [{ file, ...parsed }] : [];
    },
  );

  parsedPackageJsonFiles.forEach(({ parsed, file }) => {
    updatePackageJson({ parsed, customCondition });

    const relativeTsconfigPath = path.join(path.dirname(file), 'tsconfig.json');

    const relativeTsconfig = updatedTsconfigFiles.find(
      (tsconfig) => tsconfig.file === relativeTsconfigPath,
    );

    if (relativeTsconfig) {
      relativeTsconfig.parsed.compilerOptions ??= {};
      relativeTsconfig.parsed.compilerOptions.rootDir ??= '.';
    } else {
      log.warn(
        `No corresponding tsconfig.json found for package.json at ${file}. Expected at ${relativeTsconfigPath}`,
      );
    }

    const relativeTsconfigBuildPath = path.join(
      path.dirname(file),
      'tsconfig.build.json',
    );

    const relativeTsconfigBuild = parsedTsconfigBuildFiles.find(
      (tsconfig) => tsconfig.file === relativeTsconfigBuildPath,
    );

    if (relativeTsconfigBuild) {
      relativeTsconfigBuild.parsed.compilerOptions ??= {};
      relativeTsconfigBuild.parsed.compilerOptions.rootDir ??= 'src';
    } else {
      log.warn(
        `No corresponding tsconfig.build.json found for package.json at ${file}. Expected at ${relativeTsconfigBuildPath}`,
      );
    }
  });

  const hasRelativeTsconfigBuildsChanged = parsedTsconfigBuildFiles.some(
    ({ original, parsed }) =>
      JSON.stringify(original) !== JSON.stringify(parsed),
  );

  const hasPackageJsonsChanged = parsedPackageJsonFiles.some(
    ({ original, parsed }) =>
      JSON.stringify(original) !== JSON.stringify(parsed),
  );

  const hasRootTsconfigChanged = updatedTsconfigFiles.some(
    ({ original, parsed }) =>
      JSON.stringify(original) !== JSON.stringify(parsed),
  );

  if (
    mode === 'lint' &&
    (hasRootTsconfigChanged ||
      hasPackageJsonsChanged ||
      hasRelativeTsconfigBuildsChanged)
  ) {
    return { result: 'apply' };
  }

  if (
    !hasRootTsconfigChanged &&
    !hasPackageJsonsChanged &&
    !hasRelativeTsconfigBuildsChanged
  ) {
    return { result: 'skip', reason: 'no changes required' };
  }

  await Promise.all(
    [
      ...updatedTsconfigFiles,
      ...parsedTsconfigBuildFiles,
      ...parsedPackageJsonFiles,
    ].map(async ({ file, parsed, original }) => {
      if (JSON.stringify(original) === JSON.stringify(parsed)) {
        return;
      }
      const updatedContents = JSON.stringify(parsed, null, 2);
      await fs.promises.writeFile(file, updatedContents);
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
