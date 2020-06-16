export const mergeWithIgnoreFile = (templateFile: string) => (
  inputFile?: string,
) => {
  if (typeof inputFile === 'undefined') {
    return `${templateFile}\n`;
  }

  const replacedSkubaSection = inputFile
    .replace(/# managed by skuba[\s\S]*# end managed by skuba/, '')
    .trim();

  return `${templateFile.trim()}\n\n${replacedSkubaSection}`;
};
