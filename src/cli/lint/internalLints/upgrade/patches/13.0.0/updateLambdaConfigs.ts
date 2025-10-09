import { inspect } from 'util';

import { glob } from 'fast-glob';
import fs from 'fs-extra';

import { Git } from '../../../../../../index.js';
import { log } from '../../../../../../utils/logging.js';
import type { PatchFunction, PatchReturnType } from '../../index.js';

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

/**
 * Find a block delimited by braces and return its content and position
 * @param content The text to search in
 * @param pattern The regex pattern to match (should match up to the opening brace)
 * @returns Object containing the matched content and indices, or undefined if not found
 */
const findBracedBlock = (
  content: string,
  pattern: RegExp,
):
  | {
      content: string;
      startIndex: number;
      endIndex: number;
      matchIndex: number;
    }
  | undefined => {
  const match = pattern.exec(content);
  if (!match) {
    return undefined;
  }

  // Find the matching closing brace
  let braceCount = 1;
  const startIndex = match.index + match[0].length;
  let endIndex = startIndex;

  while (braceCount > 0 && endIndex < content.length) {
    if (content[endIndex] === '{') {
      braceCount++;
    } else if (content[endIndex] === '}') {
      braceCount--;
    }
    endIndex++;
  }

  if (braceCount !== 0) {
    return undefined;
  }

  return {
    content: content.slice(startIndex, endIndex - 1),
    startIndex,
    endIndex,
    matchIndex: match.index,
  };
};

/**
 * Find and replace all braced blocks matching a pattern
 * @param content The text to search in
 * @param pattern The regex pattern to match (should be global and match up to the opening brace)
 * @param replacer Function that receives the block content and returns the replacement, or undefined to skip
 * @returns The modified content, or undefined if no changes were made
 */
const replaceAllBracedBlocks = (
  content: string,
  pattern: RegExp,
  replacer: (blockContent: string) => string | undefined,
): string | undefined => {
  let modified = content;
  let hasChanges = false;
  let match: RegExpExecArray | null;
  let offset = 0;

  while ((match = pattern.exec(content)) !== null) {
    const adjustedIndex = match.index + offset;

    // Find the matching closing brace
    let braceCount = 1;
    const startIndex = adjustedIndex + match[0].length;
    let endIndex = startIndex;

    while (braceCount > 0 && endIndex < modified.length) {
      if (modified[endIndex] === '{') {
        braceCount++;
      } else if (modified[endIndex] === '}') {
        braceCount--;
      }
      endIndex++;
    }

    if (braceCount !== 0) {
      continue;
    }

    const blockContent = modified.slice(startIndex, endIndex - 1);
    const replacement = replacer(blockContent);

    if (replacement === undefined) {
      continue;
    }

    // Replace this block
    const before = modified.slice(0, adjustedIndex);
    const after = modified.slice(endIndex);
    const fullReplacement = `${match[0].slice(0, -1)}{${replacement}}`;
    modified = `${before}${fullReplacement}${after}`;

    // Adjust offset for next iteration
    offset += fullReplacement.length - (endIndex - adjustedIndex);
    hasChanges = true;
  }

  return hasChanges ? modified : undefined;
};

const patchCdkTsFile = ({
  contents,
  customCondition,
}: {
  contents: string;
  customCondition: string;
}):
  | {
      original: string;
      modified: string;
    }
  | undefined => {
  if (!contents.includes('aws_lambda_nodejs.NodejsFunction')) {
    return undefined;
  }

  const modified = replaceAllBracedBlocks(
    contents,
    /bundling:\s*\{/g,
    (bundlingContent) => {
      // Check if --conditions already exists
      if (bundlingContent.includes('--conditions')) {
        return undefined;
      }

      // Find esbuildArgs block within bundling
      const esbuildArgsBlock = findBracedBlock(
        bundlingContent,
        /esbuildArgs\s*:\s*\{/,
      );

      if (esbuildArgsBlock) {
        const argsContent = esbuildArgsBlock.content.trim();
        const separator = argsContent ? ', ' : '';
        const newArgsContent = `'--conditions': '${customCondition}'${separator}${argsContent}`;

        const modifiedBundlingContent = `${bundlingContent.slice(0, esbuildArgsBlock.matchIndex)}esbuildArgs: {${newArgsContent}}${bundlingContent.slice(esbuildArgsBlock.endIndex)}`;

        return modifiedBundlingContent;
      }

      // Add new esbuildArgs property
      const modifiedBundlingContent = bundlingContent.trimStart();
      return `\n    esbuildArgs: { '--conditions': '${customCondition}' },\n    ${modifiedBundlingContent}`;
    },
  );

  if (!modified) {
    return undefined;
  }

  return {
    original: contents,
    modified,
  };
};

const patchWebpackConfigFile = ({
  contents,
  customCondition,
}: {
  contents: string;
  customCondition: string;
}):
  | {
      original: string;
      modified: string;
    }
  | undefined => {
  // Find module.exports block
  const exportsBlock = findBracedBlock(contents, /module\.exports\s*=\s*\{/);
  if (!exportsBlock) {
    return undefined;
  }

  const exportsContent = exportsBlock.content;

  // Check if resolve.conditionNames already has our custom condition
  if (exportsContent.includes(customCondition)) {
    return undefined;
  }

  // Find resolve block within module.exports
  const resolveBlock = findBracedBlock(exportsContent, /resolve\s*:\s*\{/);

  if (resolveBlock) {
    const resolveContent = resolveBlock.content;

    // Find conditionNames array within resolve
    const conditionNamesMatch = /conditionNames\s*:\s*\[([^\]]*)\]/s.exec(
      resolveContent,
    );

    if (conditionNamesMatch?.[1] !== undefined) {
      // Add custom condition to existing conditionNames array
      const existingConditions = conditionNamesMatch[1].trim();
      const separator = existingConditions ? ', ' : '';
      const newConditionNames = `conditionNames: ['${customCondition}'${separator}${existingConditions}]`;

      const modifiedResolveContent = `${resolveContent.slice(0, conditionNamesMatch.index)}${newConditionNames}${resolveContent.slice(conditionNamesMatch.index + conditionNamesMatch[0].length)}`;

      const modifiedExportsContent = `${exportsContent.slice(0, resolveBlock.matchIndex)}resolve: {${modifiedResolveContent}}${exportsContent.slice(resolveBlock.endIndex)}`;

      const modified = `${contents.slice(0, exportsBlock.startIndex)}${modifiedExportsContent}${contents.slice(exportsBlock.endIndex)}`;

      return {
        original: contents,
        modified,
      };
    }

    // Add conditionNames property to resolve block
    const modifiedResolveContent = resolveContent.trimStart();
    const newResolveContent = `\n    conditionNames: ['${customCondition}'],\n    ${modifiedResolveContent}`;

    const modifiedExportsContent = `${exportsContent.slice(0, resolveBlock.matchIndex)}resolve: {${newResolveContent}}${exportsContent.slice(resolveBlock.endIndex)}`;

    const modified = `${contents.slice(0, exportsBlock.startIndex)}${modifiedExportsContent}${contents.slice(exportsBlock.endIndex)}`;

    return {
      original: contents,
      modified,
    };
  }

  // Add resolve property with conditionNames to module.exports
  const modifiedExportsContent = exportsContent.trimStart();
  const newExportsContent = `\n  resolve: {\n    conditionNames: ['${customCondition}'],\n  },\n  ${modifiedExportsContent}`;

  const modified = `${contents.slice(0, exportsBlock.startIndex)}${newExportsContent}${contents.slice(exportsBlock.endIndex)}`;

  return {
    original: contents,
    modified,
  };
};

const patchServerlessEsbuildFile = ({
  contents,
  customCondition,
}: {
  contents: string;
  customCondition: string;
}):
  | {
      original: string;
      modified: string;
    }
  | undefined => {
  // Check if custom condition already exists
  if (contents.includes(customCondition)) {
    return undefined;
  }

  // Check for serverless-esbuild plugin
  if (!contents.includes('serverless-esbuild')) {
    return undefined;
  }

  // Match either build: or custom: followed by esbuild: with nested configuration
  // This regex only matches multi-line esbuild blocks, not inline "esbuild: false"
  const esbuildBlockRegex =
    /^((?:build|custom):)\s*\n(\s+)(esbuild:)\s*\n((?:\2\s+.+\n)*)/gm;

  let match;
  let modified = contents;
  let hasChanges = false;

  // Reset regex lastIndex for multiple matches
  esbuildBlockRegex.lastIndex = 0;

  while ((match = esbuildBlockRegex.exec(contents)) !== null) {
    const [fullMatch, blockType, baseIndent, esbuildLabel, esbuildContent] =
      match;

    // Check if esbuild is disabled (esbuild: false)
    if (/esbuild:\s*false/.exec(fullMatch)) {
      continue;
    }

    // Check if conditions already exists in this block
    if (esbuildContent?.includes('conditions:')) {
      continue;
    }

    // Determine indentation (should be baseIndent + 2 spaces for YAML)
    const conditionsIndent = `${baseIndent}  `;
    const arrayItemIndent = `${conditionsIndent}  `;

    // Build the new esbuild block with conditions added
    const newEsbuildBlock = `${blockType}\n${baseIndent}${esbuildLabel}\n${conditionsIndent}conditions:\n${arrayItemIndent}- '${customCondition}'\n${esbuildContent}`;

    // Replace in the modified content
    modified = modified.replace(fullMatch, newEsbuildBlock);
    hasChanges = true;
  }

  if (!hasChanges) {
    return undefined;
  }

  return {
    original: contents,
    modified,
  };
};

const patchServerlessFile = ({
  contents,
  customCondition,
}: {
  contents: string;
  customCondition: string;
}):
  | {
      original: string;
      modified: string;
    }
  | undefined => {
  if (contents.includes('esbuild')) {
    return patchServerlessEsbuildFile({
      contents,
      customCondition,
    });
  }

  if (contents.includes('serverless-webpack')) {
    return undefined;
  }

  // patch package patterns for serverless framework
  if (contents.includes('package.json')) {
    return undefined;
  }

  // Match package: blocks with patterns: arrays
  const packageBlockRegex =
    /^(\s*)(package:)\s*\n(\s+)(patterns:)\s*\n((?:\3\s+-\s+.+\n)*)/gm;

  let match;
  let modified = contents;
  let hasChanges = false;

  // Reset regex lastIndex for multiple matches
  packageBlockRegex.lastIndex = 0;

  while ((match = packageBlockRegex.exec(contents)) !== null) {
    const [
      fullMatch,
      baseIndent,
      packageLabel,
      patternsIndent,
      patternsLabel,
      patternsContent,
    ] = match;

    // Check if package.json already exists in this block
    if (patternsContent?.includes('package.json')) {
      continue;
    }

    // Add package.json to the patterns list
    const arrayItemIndent = `${patternsIndent}  `;
    const newPackageBlock = `${baseIndent}${packageLabel}\n${patternsIndent}${patternsLabel}\n${patternsContent}${arrayItemIndent}- 'package.json'\n`;

    // Replace in the modified content
    modified = modified.replace(fullMatch, newPackageBlock);
    hasChanges = true;
  }

  if (!hasChanges) {
    return undefined;
  }

  return {
    original: contents,
    modified,
  };
};

export const tryUpdateLambdaConfigs: PatchFunction = async ({
  mode,
}): Promise<PatchReturnType> => {
  let customCondition: string;
  try {
    const { repo } = await Git.getOwnerAndRepo({ dir: process.cwd() });
    customCondition = `@seek/${repo}/source`;
  } catch {
    return { result: 'skip', reason: 'no repository name found' };
  }

  const [tsFileNames, webpackFileNames, serverlessFileNames] =
    await Promise.all([
      glob('**/*.ts', {
        ignore: [
          '**/.git',
          '**/node_modules',
          'src/cli/lint/internalLints/upgrade/patches/**/*',
        ],
      }),
      glob('**/*webpack.config.js', {
        ignore: ['**/.git', '**/node_modules'],
      }),
      glob('**/serverless*.y*ml', {
        ignore: ['**/.git', '**/node_modules'],
      }),
    ]);

  if (
    !tsFileNames.length &&
    !webpackFileNames.length &&
    !serverlessFileNames.length
  ) {
    return {
      result: 'skip',
      reason: 'no .ts or webpack config files or .yml files found',
    };
  }

  const [tsFiles, webpackFiles, serverlessFiles] = await Promise.all([
    fetchFiles(tsFileNames),
    fetchFiles(webpackFileNames),
    fetchFiles(serverlessFileNames),
  ]);

  const filesToPatch = [
    ...tsFiles.flatMap(({ file, contents }) => {
      const patched = patchCdkTsFile({
        contents,
        customCondition,
      });
      if (patched && patched.modified !== patched.original) {
        return {
          file,
          original: patched.original,
          modified: patched.modified,
        };
      }
      return [];
    }),
    ...webpackFiles.flatMap(({ file, contents }) => {
      const patched = patchWebpackConfigFile({
        contents,
        customCondition,
      });
      if (patched && patched.modified !== patched.original) {
        return {
          file,
          original: patched.original,
          modified: patched.modified,
        };
      }
      return [];
    }),
    ...serverlessFiles.flatMap(({ file, contents }) => {
      const patched = patchServerlessFile({
        contents,
        customCondition,
      });
      if (patched && patched.modified !== patched.original) {
        return {
          file,
          original: patched.original,
          modified: patched.modified,
        };
      }
      return [];
    }),
  ];

  if (!filesToPatch.length) {
    return { result: 'skip', reason: 'no lambda configurations to patch' };
  }

  if (mode === 'lint') {
    return { result: 'apply' };
  }

  await Promise.all(
    filesToPatch.map(async ({ file, modified }) => {
      await fs.promises.writeFile(file, modified, 'utf8');
    }),
  );

  return { result: 'apply' };
};

export const updateLambdaConfigs: PatchFunction = async (config) => {
  try {
    return await tryUpdateLambdaConfigs(config);
  } catch (err) {
    log.warn('Failed to write configure `tsconfig.json` and `package.json`');
    log.subtle(inspect(err));
    return { result: 'skip', reason: 'due to an error' };
  }
};
