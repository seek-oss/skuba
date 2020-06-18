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
      choices: FormChoice[];
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

    run(): Promise<ReadonlyArray<T>>;
  }

  export class Select<T> {
    constructor(opts: {
      name: string;
      message: string;
      choices: ReadonlyArray<T>;
      initial?: T;
    });

    run(): Promise<T>;
  }

  export class Snippet<T> {
    constructor(opts: {
      name: string;
      message: string;
      fields: ReadonlyArray<{
        name: string;
        message?: string;
        initial?: string;
        validate?: (
          values: Record<string, string>,
        ) => boolean | string | Promise<boolean | string>;
      }>;
      required?: boolean;
      template: string;
    });

    run(): Promise<{ result: string; values: T }>;
  }
}
