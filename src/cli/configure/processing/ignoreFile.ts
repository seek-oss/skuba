export const mergeWithIgnoreFile = (templateFile: string) => (
  inputFile?: string,
) => {
  if (typeof inputFile === 'undefined') {
    return `${templateFile}`;
  }

  if (inputFile.includes('# managed by skuba')) {
    const replacedSkubaSection = inputFile.replace(
      /# managed by skuba[\s\S]*# end managed by skuba/,
      templateFile,
    );

    return `${replacedSkubaSection}`;
  }

  const outputFile = [templateFile.trim(), inputFile.trim()]
    .join('\n\n')
    .trim();

  return `${outputFile}\n`;
};
