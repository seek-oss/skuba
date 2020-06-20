export const mergeWithIgnoreFile = (rawTemplateFile: string) => {
  const templateFile = rawTemplateFile.trim();

  return (inputFile?: string) => {
    if (typeof inputFile === 'undefined') {
      return `${templateFile}\n`;
    }

    const replacedFile = inputFile.replace(
      /# managed by skuba[\s\S]*# end managed by skuba/,
      templateFile,
    );

    if (replacedFile.includes(templateFile)) {
      return replacedFile;
    }

    const outputFile = [templateFile, inputFile.trim()].join('\n\n').trim();

    return `${outputFile}\n`;
  };
};
