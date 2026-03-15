export const formatOxfmt = async (fileName: string, sourceText: string): Promise<string> => {
  const { format } = await import("oxfmt");
  const result = await format(fileName, sourceText);
  return result.code;
};
