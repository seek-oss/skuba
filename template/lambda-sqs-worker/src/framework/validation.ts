export const validateJson = <T>(input: string, filter: (data: unknown) => T) =>
  filter(JSON.parse(input));
