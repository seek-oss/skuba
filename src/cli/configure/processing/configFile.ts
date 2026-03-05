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

export const replaceManagedSection = (input: string, template: string) =>
  input.replace(/# managed by skuba[\s\S]*# end managed by skuba/, template);

export const mergeWithConfigFile = (
  rawTemplateFile: string,
  fileType: 'ignore' = 'ignore',
) => {
  const templateFile = rawTemplateFile.trim();

  let generator: (s: string[]) => Set<string>;

  switch (fileType) {
    case 'ignore':
      generator = generateIgnoreFileSimpleVariants;
      break;
  }

  const templatePatterns = generator([
    ...OUTDATED_PATTERNS,
    ...templateFile.split('\n').map((line) => line.trim()),
  ]);

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
