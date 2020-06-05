const splitIntoSanitisedLines = (str: string) =>
  str
    .trim()
    .split(/\r?\n/)
    .map((line) => line.trim());

export const mergeWithIgnoreFile = (templateFile: string) => (
  inputFile?: string,
) => {
  const templateLines = splitIntoSanitisedLines(templateFile);

  const templateSet = new Set(templateLines.filter((line) => line !== ''));

  const inputLines = splitIntoSanitisedLines(inputFile ?? '').filter(
    (line) => !templateSet.has(line),
  );

  const outputFile = [
    templateLines.join('\n').trim(),
    inputLines.join('\n').trim(),
  ]
    .filter((blob) => blob !== '')
    .join('\n\n')
    .trim();

  return `${outputFile}\n`;
};
