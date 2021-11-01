import * as GitHub from '../../../../api/github';
import { StreamInterceptor } from '../../../../cli/lint/external';

import { createTscAnnotations } from './tsc';

const mockOutput = jest.fn<string, any>();

const tscOutputStream = {
  output: mockOutput,
} as unknown as StreamInterceptor;

afterEach(() => {
  jest.resetAllMocks();
});

it('should create annotations from multiple single line output from TSC', () => {
  const tscOk = false;
  const output =
    "\x1B[34mtsc      │\x1B[39m src/skuba.ts(1,4): error TS6133: 'hello' is declared but its value is never read.\n" +
    "\x1B[34mtsc      │\x1B[39m src/index.ts(6,3): error TS6133: 'world' is declared but its value is never read.\n" +
    '\x1B[34mtsc      │\x1B[39m TSFILE: /workdir/skuba/dist/tsconfig.tsbuildinfo\n' +
    '\x1B[34mtsc      │\x1B[39m \x1B[0mtsc --noEmit exited with code 2\x1B[0m\n';
  mockOutput.mockReturnValue(output);

  const expectedAnnotations: GitHub.Annotation[] = [
    {
      annotation_level: 'failure',
      path: 'src/skuba.ts',
      start_line: 1,
      end_line: 1,
      start_column: 4,
      end_column: 4,
      message: "'hello' is declared but its value is never read.",
      title: 'tsc',
    },
    {
      annotation_level: 'failure',
      path: 'src/index.ts',
      start_line: 6,
      end_line: 6,
      start_column: 3,
      end_column: 3,
      message: "'world' is declared but its value is never read.",
      title: 'tsc',
    },
  ];

  const annotation = createTscAnnotations(tscOk, tscOutputStream);

  expect(annotation).toStrictEqual(expectedAnnotations);
});

it('should create annotations from a single and a multiline result from TSC', () => {
  const tscOk = false;
  const output =
    "\x1B[34mtsc      │\x1B[39m src/skuba.ts(1,4): error TS6133: 'hello' is declared but its value is never read.\n" +
    '\x1B[34mtsc      │\x1B[39m src/index.ts(18,7): error TS2769: No overload matches this call.\n' +
    "\x1B[34mtsc      │\x1B[39m   Overload 1 of 2, '(obj: LogContext, msg?: string | undefined, ...args: any[]): void', gave the following error.\n" +
    "\x1B[34mtsc      │\x1B[39m     Argument of type 'unknown' is not assignable to parameter of type 'LogContext'.\n" +
    "\x1B[34mtsc      │\x1B[39m   Overload 2 of 2, '(msg?: string | undefined, ...args: any[]): void', gave the following error.\n" +
    "\x1B[34mtsc      │\x1B[39m     Argument of type 'unknown' is not assignable to parameter of type 'string | undefined'.\n" +
    "\x1B[34mtsc      │\x1B[39m       Type 'unknown' is not assignable to type 'string'.\n" +
    '\x1B[34mtsc      │\x1B[39m TSFILE: /workdir/skuba/dist/tsconfig.tsbuildinfo\n' +
    '\x1B[34mtsc      │\x1B[39m \x1B[0mtsc --noEmit exited with code 2\x1B[0m\n';
  mockOutput.mockReturnValue(output);

  const expectedAnnotations: GitHub.Annotation[] = [
    {
      annotation_level: 'failure',
      path: 'src/skuba.ts',
      start_line: 1,
      end_line: 1,
      start_column: 4,
      end_column: 4,
      message: "'hello' is declared but its value is never read.",
      title: 'tsc',
    },
    {
      annotation_level: 'failure',
      path: 'src/index.ts',
      start_line: 18,
      end_line: 18,
      start_column: 7,
      end_column: 7,
      message:
        'No overload matches this call.\n' +
        "  Overload 1 of 2, '(obj: LogContext, msg?: string | undefined, ...args: any[]): void', gave the following error.\n" +
        "    Argument of type 'unknown' is not assignable to parameter of type 'LogContext'.\n" +
        "  Overload 2 of 2, '(msg?: string | undefined, ...args: any[]): void', gave the following error.\n" +
        "    Argument of type 'unknown' is not assignable to parameter of type 'string | undefined'.\n" +
        "      Type 'unknown' is not assignable to type 'string'.",
      title: 'tsc',
    },
  ];

  const annotation = createTscAnnotations(tscOk, tscOutputStream);

  expect(annotation).toStrictEqual(expectedAnnotations);
});

it('should create annotations from a single and a multiline result from TSC when pretty is enabled', () => {
  const tscOk = false;
  const output =
    "\x1B[34mtsc      │\x1B[39m \x1B[96msrc/skuba.ts\x1B[0m:\x1B[93m6\x1B[0m:\x1B[93m3\x1B[0m - \x1B[91merror\x1B[0m\x1B[90m TS6133: \x1B[0m'hello' is declared but its value is never read.\n" +
    '\x1B[34mtsc      │\x1B[39m \n' +
    '\x1B[34mtsc      │\x1B[39m \x1B[7m6\x1B[0m   hello,\n' +
    '\x1B[34mtsc      │\x1B[39m \x1B[7m \x1B[0m \x1B[91m  ~~~~\x1B[0m\n' +
    '\x1B[34mtsc      │\x1B[39m \n' +
    '\x1B[34mtsc      │\x1B[39m \x1B[96msrc/index.ts\x1B[0m:\x1B[93m18\x1B[0m:\x1B[93m7\x1B[0m - \x1B[91merror\x1B[0m\x1B[90m TS2769: \x1B[0mNo overload matches this call.\n' +
    "\x1B[34mtsc      │\x1B[39m   Overload 1 of 2, '(obj: LogContext, msg?: string | undefined, ...args: any[]): void', gave the following error.\n" +
    "\x1B[34mtsc      │\x1B[39m     Argument of type 'unknown' is not assignable to parameter of type 'LogContext'.\n" +
    "\x1B[34mtsc      │\x1B[39m   Overload 2 of 2, '(msg?: string | undefined, ...args: any[]): void', gave the following error.\n" +
    "\x1B[34mtsc      │\x1B[39m     Argument of type 'unknown' is not assignable to parameter of type 'string | undefined'.\n" +
    "\x1B[34mtsc      │\x1B[39m       Type 'unknown' is not assignable to type 'string'.\n" +
    '\x1B[34mtsc      │\x1B[39m \n' +
    '\x1B[34mtsc      │\x1B[39m \x1B[7m18\x1B[0m       error,\n' +
    '\x1B[34mtsc      │\x1B[39m \x1B[7m  \x1B[0m \x1B[91m      ~~~~~\x1B[0m\n' +
    '\x1B[34mtsc      │\x1B[39m \n' +
    '\x1B[34mtsc      │\x1B[39m \n' +
    '\x1B[34mtsc      │\x1B[39m \n' +
    '\x1B[34mtsc      │\x1B[39m Found 2 errors.\n' +
    '\x1B[34mtsc      │\x1B[39m \n' +
    '\x1B[34mtsc      │\x1B[39m \x1B[0mtsc --noEmit exited with code 1\x1B[0m\n';
  mockOutput.mockReturnValue(output);

  const expectedAnnotations: GitHub.Annotation[] = [
    {
      annotation_level: 'failure',
      path: 'src/skuba.ts',
      start_line: 6,
      end_line: 6,
      start_column: 3,
      end_column: 3,
      message: "'hello' is declared but its value is never read.",
      title: 'tsc',
    },
    {
      annotation_level: 'failure',
      path: 'src/index.ts',
      start_line: 18,
      end_line: 18,
      start_column: 7,
      end_column: 7,
      message:
        'No overload matches this call.\n' +
        "  Overload 1 of 2, '(obj: LogContext, msg?: string | undefined, ...args: any[]): void', gave the following error.\n" +
        "    Argument of type 'unknown' is not assignable to parameter of type 'LogContext'.\n" +
        "  Overload 2 of 2, '(msg?: string | undefined, ...args: any[]): void', gave the following error.\n" +
        "    Argument of type 'unknown' is not assignable to parameter of type 'string | undefined'.\n" +
        "      Type 'unknown' is not assignable to type 'string'.",
      title: 'tsc',
    },
  ];

  const annotation = createTscAnnotations(tscOk, tscOutputStream);

  expect(annotation).toStrictEqual(expectedAnnotations);
});
it('should return an empty array when tscOk is true', () => {
  const tscOk = true;
  const output =
    "\x1B[34mtsc      │\x1B[39m src/index.ts(6,3): error TS6133: 'test' is declared but its value is never read.\n" +
    '\x1B[34mtsc      │\x1B[39m TSFILE: /workdir/skuba/dist/tsconfig.tsbuildinfo\n' +
    '\x1B[34mtsc      │\x1B[39m \x1B[0mtsc --noEmit exited with code 2\x1B[0m\n';

  mockOutput.mockReturnValue(output);

  const expectedAnnotations: GitHub.Annotation[] = [];

  const annotation = createTscAnnotations(tscOk, tscOutputStream);

  expect(annotation).toStrictEqual(expectedAnnotations);
});
