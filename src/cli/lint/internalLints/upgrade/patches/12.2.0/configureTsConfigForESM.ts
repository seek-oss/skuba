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

export const addJestModuleNameMapper = (
  contents: string,
  srcPaths: string[],
) => {
  const moduleNameRegex = /moduleNameMapper:\s*\{([\s\S]*?)\}/;
  const match = moduleNameRegex.exec(contents);

  const srcPathArray = srcPaths.map((subfolderPath) =>
    subfolderPath === '.' || subfolderPath === './'
      ? '<rootDir>/src/$1'
      : `<rootDir>/${subfolderPath}/src/$1`,
  );

  const srcModuleMappers = JSON.stringify({
    '^#src/(.*)\\.js$': srcPathArray,
    '^#src/(.*)$': srcPathArray,
  });

  // strip the surrounding { } from the JSON stringify result
  const newModuleNameMapper = srcModuleMappers
    .replace(/^{/, '')
    .replace(/}$/, '');

  if (match?.[1] !== undefined) {
    // insert srcModuleMappers into existing moduleNameMapper
    const existingModuleMappers = match[1];

    const newContents = `${contents.slice(
      0,
      match.index,
    )}moduleNameMapper: {${existingModuleMappers},${newModuleNameMapper}}${contents.slice(
      match.index + match[0].length,
    )}`;

    return newContents;
  }

  // Add moduleNameMapper if not present

  const insertionPointRegex = /(\b(jest|export\s+default)\b[\s\S]*?{)/;
  const insertionMatch = insertionPointRegex.exec(contents);

  if (insertionMatch?.[1] !== undefined) {
    const insertionIndex = insertionMatch.index + insertionMatch[0].length;
    const moduleNameMapperString = `\n  moduleNameMapper: {${newModuleNameMapper}},`;

    const newContents =
      contents.slice(0, insertionIndex) +
      moduleNameMapperString +
      contents.slice(insertionIndex);

    return newContents;
  }

  log.warn(
    'Could not find a suitable place to insert moduleNameMapper in jest config',
  );
  return contents;
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
  parsed.imports['#src/*'] ??= {
    [customCondition]: './src/*',
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
  const jestConfigPatterns = ['**/jest.config.ts', '**/jest.config.*.ts'];

  const [tsconfigJsonFiles, tsconfigBuildJsonFiles, jestConfigFiles] =
    await Promise.all([
      fetchFiles(tsconfigJsonPatterns),
      fetchFiles(tsconfigBuildJsonPatterns),
      fetchFiles(jestConfigPatterns),
    ]);

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

  const updatedJestConfigFiles = jestConfigFiles.map(({ file, contents }) => {
    const parsed = addJestModuleNameMapper(contents, allSrcPaths);
    return { file, original: contents, parsed };
  });

  const hasJestConfigsChanged = updatedJestConfigFiles.some(
    ({ parsed, original }) => original !== parsed,
  );

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
      hasRelativeTsconfigBuildsChanged ||
      hasJestConfigsChanged)
  ) {
    return { result: 'apply' };
  }

  if (
    !hasRootTsconfigChanged &&
    !hasPackageJsonsChanged &&
    !hasRelativeTsconfigBuildsChanged &&
    !hasJestConfigsChanged
  ) {
    return { result: 'skip', reason: 'no changes required' };
  }

  await Promise.all(
    [
      ...updatedTsconfigFiles,
      ...parsedTsconfigBuildFiles,
      ...parsedPackageJsonFiles,
      ...updatedJestConfigFiles,
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
