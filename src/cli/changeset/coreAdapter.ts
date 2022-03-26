const inputs = {
  publish: 'yarn changeset publish',
  commit: 'Version Packages',
  title: 'Version Packages',
} as const;

export const getInput = (name: keyof typeof inputs): string => inputs[name];

// Maybe we could store these in a checkrun..?
export const setFailed = (message: string) => {
  // eslint-disable-next-line no-console
  console.error(message);
  throw new Error();
};

export const setOutput = (_key: string, _value: string) => {};
