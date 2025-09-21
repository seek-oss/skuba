import * as z from 'zod';

/**
 * Patterns that are superseded by skuba's bundled ignore file patterns and are
 * non-trivial to derive using e.g. `generateSimpleVariants`.
 */
const OUTDATED_PATTERNS = ['node_modules_bak/', 'tmp-*/'];

const ASTERISKS = /\*/g;
const LEADING_SLASH = /^\//;
const TRAILING_SLASH = /\/$/;

/**
 * Generate simple variants of an ignore pattern for exact matching purposes.
 *
 * Note that these patterns are not actually equivalent (e.g. `lib` matches more
 * than `lib/`) but they generally represent the same _intent_.
 */
export const generateIgnoreFileSimpleVariants = (patterns: string[]) => {
  const set = new Set<string>();

  for (const pattern of patterns) {
    const deAsterisked = pattern.replace(ASTERISKS, '');
    const stripped = deAsterisked
      .replace(LEADING_SLASH, '')
      .replace(TRAILING_SLASH, '');

    set.add(pattern);
    set.add(deAsterisked);
    set.add(deAsterisked.replace(LEADING_SLASH, ''));
    set.add(deAsterisked.replace(TRAILING_SLASH, ''));
    set.add(stripped);

    if (stripped !== '') {
      set.add(`/${stripped}`);
      set.add(`${stripped}/`);
      set.add(`/${stripped}/`);
    }
  }

  set.delete('');

  return set;
};

const amendPnpmWorkspaceTemplate = (
  templateFile: string,
  packageJson?: string,
) => {
  if (!packageJson) {
    return templateFile;
  }
  let rawJSON;
  try {
    rawJSON = JSON.parse(packageJson) as unknown;
  } catch {
    throw new Error('package.json is not valid JSON');
  }
  const parsed = z
    .object({
      minimumReleaseAgeExcludeOverload: z.array(z.string()).optional(),
    })
    .safeParse(rawJSON);

  const excludes = parsed.data?.minimumReleaseAgeExcludeOverload;
  if (
    !excludes ||
    Array.isArray(excludes) === false ||
    excludes.some((e) => typeof e !== 'string')
  ) {
    return templateFile;
  }

  const targetKey = 'minimumReleaseAgeExclude:';
  const index = templateFile.indexOf(targetKey);

  if (index === -1) {
    return templateFile;
  }

  const beforeKey = templateFile.substring(0, index);
  const afterKey = templateFile.substring(index + targetKey.length);
  const excludeLines = excludes.map((exclude) => `  - '${exclude}'`).join('\n');

  return `${beforeKey + targetKey}\n${excludeLines}${afterKey}`;
};

export const replaceManagedSection = (input: string, template: string) =>
  input.replace(/# managed by skuba[\s\S]*# end managed by skuba/, template);

export const mergeWithConfigFile = (
  rawTemplateFile: string,
  fileType: 'ignore' | 'pnpm-workspace' = 'ignore',
  packageJson?: string,
) => {
  const templateFile =
    fileType === 'pnpm-workspace'
      ? amendPnpmWorkspaceTemplate(rawTemplateFile.trim(), packageJson)
      : rawTemplateFile.trim();

  let generator: (s: string[], packageJson?: string) => Set<string>;

  switch (fileType) {
    case 'ignore':
      generator = generateIgnoreFileSimpleVariants;
      break;
    case 'pnpm-workspace':
      generator = () => new Set<string>();
      break;
  }

  const templatePatterns = generator(
    [
      ...OUTDATED_PATTERNS,
      ...templateFile.split('\n').map((line) => line.trim()),
    ],
    packageJson,
  );

  return (rawInputFile?: string) => {
    if (rawInputFile === undefined) {
      return `${templateFile}\n`;
    }

    const replacedFile = replaceManagedSection(
      rawInputFile.replace(/\r?\n/g, '\n'),
      templateFile,
    );

    if (replacedFile.includes(templateFile)) {
      return replacedFile;
    }

    // Crunch the existing lines of a non-skuba config.
    const migratedFile = replacedFile
      .split('\n')
      .filter((line) => !templatePatterns.has(line))
      .join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    const outputFile = [templateFile, migratedFile].join('\n\n').trim();

    return `${outputFile}\n`;
  };
};
