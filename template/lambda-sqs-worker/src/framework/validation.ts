export const validateJson = <T>(input: string, filter: (input: unknown) => T) =>
  filter(JSON.parse(input));
