interface Timeout extends PromiseLike<void> {
  clear?: () => void;
}

export const sleep = (ms: number): Timeout => {
  let timeout: NodeJS.Timeout;

  return Object.assign(
    new Promise<void>((resolve) => (timeout = setTimeout(resolve, ms))),
    { clear: () => clearTimeout(timeout) },
  );
};
