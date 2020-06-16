export const mergeWithIgnoreFile = (templateFile: string) => (
  inputFile?: string,
) => {
  const replacedSkubaSection = inputFile?.replace(
    /# managed by skuba[\s\S]*# end managed by skuba/,
    '',
  );
  if (replacedSkubaSection) {
    return `${templateFile}\n\n${replacedSkubaSection}`;
  }

  return `${templateFile}\n`;
};
