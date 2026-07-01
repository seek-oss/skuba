export const handler = async (event: unknown): Promise<unknown> => {
  const { transform } = await import('./lazy.js');
  return transform(event);
};
