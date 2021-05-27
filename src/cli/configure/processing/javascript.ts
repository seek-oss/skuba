export const prependImport = (name: string, file?: string) =>
  [`import '${name}';\n`, file]
    .filter((value) => value !== undefined)
    .join('\n');

export const stripImports = (names: readonly string[], inputFile: string) => {
  const searchStrings = names.flatMap((name) => [`'${name}'`, `"${name}"`]);

  const outputFile = inputFile
    .split(/\r?\n/)
    .filter((line) => !searchStrings.some((str) => line.includes(str)))
    .join('\n')
    .trim();

  return `${outputFile}\n`;
};
