export const mergeWithIgnoreFile = (templateFile: string) => (
  inputFile?: string,
) => {
  if (typeof inputFile === 'undefined') {
    return templateFile;
  }

  const replacedFile = inputFile.replace(
    /# managed by skuba[\s\S]*# end managed by skuba/,
    templateFile,
  );

  if (replacedFile.includes(templateFile)) {
    return replacedFile;
  }

  const outputFile = [templateFile.trim(), inputFile.trim()]
    .join('\n\n')
    .trim();

  return `${outputFile}\n`;
};
