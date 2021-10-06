declare module 'function-arguments' {
  const fnArgs: (fn: (...args: unknown[]) => unknown) => string[];

  export default fnArgs;
}
