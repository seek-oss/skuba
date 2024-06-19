/**
 * Create a function that reads an environment variable and runs it through the
 * provided parsing function.
 */
export const create =
  <T>(parse: (value: string, name: string) => T) =>
  <U = T>(name: string, opts?: Readonly<{ default: U }>): T | U => {
    const value = process.env[name];

    if (typeof value !== 'undefined') {
      return parse(value, name);
    }

    if (typeof opts !== 'undefined') {
      return opts.default;
    }

    throw Error(`process.env.${name} is not set`);
  };
