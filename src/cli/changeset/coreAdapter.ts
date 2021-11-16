const inputs: Record<string, string | undefined> = {
  publish: 'yarn changeset publish',
  version: undefined,
  commit: undefined,
  title: undefined,
};

export const getInput = (name: string): string | undefined => inputs[name];

// Maybe we could store these in a checkrun..?
export const setFailed = (message: string) => {
  // eslint-disable-next-line no-console
  console.error(message);
  throw new Error();
};

export const setOutput = (_key: string, _value: string) => {};
