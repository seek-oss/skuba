declare module 'enquirer' {
  export interface FormChoice {
    name: string;
    message: string;
    initial?: string;
    result?: (value: string) => string;
    validate?: (value: string) => boolean | string | Promise<boolean | string>;
  }

  export class Confirm {
    constructor(opts: { name: string; message: string; initial?: boolean });

    run(): Promise<boolean>;
  }

  export class Form<T> {
    constructor(opts: {
      name: string;
      message: string;
      choices: readonly FormChoice[];
      result?: (values: Record<string, string>) => Record<string, string>;
      validate?: (
        values: Record<string, string>,
      ) => boolean | string | Promise<boolean | string>;
    });

    run(): Promise<T>;
  }

  export class Input {
    constructor(opts: FormChoice);

    run(): Promise<string>;
  }

  export class MultiSelect<T> {
    constructor(opts: {
      name: string;
      message: string;
      choices: Array<{
        name: string;
        value: T;
      }>;
    });

    run(): Promise<readonly T[]>;
  }

  export class Select<T> {
    constructor(opts: {
      name: string;
      message: string;
      choices: readonly T[];
      initial?: T;
    });

    run(): Promise<T>;
  }
}
