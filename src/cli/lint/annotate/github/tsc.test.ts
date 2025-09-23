import type { StreamInterceptor } from '../../../lint/external.js';

import { createTscAnnotations } from './tsc.js';

import type { GitHub } from '@skuba-lib/api';

const mockOutput = jest.fn<string, any>();

const tscOutputStream = {
  output: mockOutput,
} as unknown as StreamInterceptor;

afterEach(() => {
  jest.resetAllMocks();
});

it('should create annotations from single-line tsc output', () => {
  const tscOk = false;
  const output =
    "src/skuba.ts(1,4): error TS6133: 'hello' is declared but its value is never read.\n" +
    "src/index.ts(6,3): error TS6133: 'world' is declared but its value is never read.\n" +
    'TSFILE: /workdir/skuba/dist/tsconfig.tsbuildinfo\n' +
    '\x1B[0mtsc --noEmit exited with code 2\x1B[0m\n';
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
      title: 'tsc (TS6133)',
    },
    {
      annotation_level: 'failure',
      path: 'src/index.ts',
      start_line: 6,
      end_line: 6,
      start_column: 3,
      end_column: 3,
      message: "'world' is declared but its value is never read.",
      title: 'tsc (TS6133)',
    },
  ];

  const annotation = createTscAnnotations(tscOk, tscOutputStream);

  expect(annotation).toStrictEqual(expectedAnnotations);
});

it('should create annotations from single- and multi-line tsc output', () => {
  const tscOk = false;
  const output =
    "src/skuba.ts(1,4): error TS6133: 'hello' is declared but its value is never read.\n" +
    'src/index.ts(18,7): error TS2769: No overload matches this call.\n' +
    "  Overload 1 of 2, '(obj: LogContext, msg?: string | undefined, ...args: any[]): void', gave the following error.\n" +
    "    Argument of type 'unknown' is not assignable to parameter of type 'LogContext'.\n" +
    "  Overload 2 of 2, '(msg?: string | undefined, ...args: any[]): void', gave the following error.\n" +
    "    Argument of type 'unknown' is not assignable to parameter of type 'string | undefined'.\n" +
    "      Type 'unknown' is not assignable to type 'string'.\n" +
    'TSFILE: /workdir/skuba/dist/tsconfig.tsbuildinfo\n' +
    '\x1B[0mtsc --noEmit exited with code 2\x1B[0m\n';
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
      title: 'tsc (TS6133)',
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
      title: 'tsc (TS2769)',
    },
  ];

  const annotation = createTscAnnotations(tscOk, tscOutputStream);

  expect(annotation).toStrictEqual(expectedAnnotations);
});

it('should create annotations from single- and multi-line tsc output when `pretty` is enabled', () => {
  const tscOk = false;
  const output =
    "\x1B[96msrc/skuba.ts\x1B[0m:\x1B[93m6\x1B[0m:\x1B[93m3\x1B[0m - \x1B[91merror\x1B[0m\x1B[90m TS6133: \x1B[0m'hello' is declared but its value is never read.\n" +
    '\n' +
    '\x1B[7m6\x1B[0m   hello,\n' +
    '\x1B[7m \x1B[0m \x1B[91m  ~~~~\x1B[0m\n' +
    '\n' +
    '\x1B[96msrc/index.ts\x1B[0m:\x1B[93m18\x1B[0m:\x1B[93m7\x1B[0m - \x1B[91merror\x1B[0m\x1B[90m TS2769: \x1B[0mNo overload matches this call.\n' +
    "  Overload 1 of 2, '(obj: LogContext, msg?: string | undefined, ...args: any[]): void', gave the following error.\n" +
    "    Argument of type 'unknown' is not assignable to parameter of type 'LogContext'.\n" +
    "  Overload 2 of 2, '(msg?: string | undefined, ...args: any[]): void', gave the following error.\n" +
    "    Argument of type 'unknown' is not assignable to parameter of type 'string | undefined'.\n" +
    "      Type 'unknown' is not assignable to type 'string'.\n" +
    '\n' +
    '\x1B[7m18\x1B[0m       error,\n' +
    '\x1B[7m  \x1B[0m \x1B[91m      ~~~~~\x1B[0m\n' +
    '\n' +
    '\n' +
    '\n' +
    'Found 2 errors.\n' +
    '\n' +
    '\x1B[0mtsc --noEmit exited with code 1\x1B[0m\n';
  mockOutput.mockReturnValue(output);

  const expectedAnnotations: GitHub.Annotation[] = [
    {
      annotation_level: 'failure',
      path: 'src/skuba.ts',
      start_line: 6,
      end_line: 6,
      start_column: 3,
      end_column: 3,
      message:
        "'hello' is declared but its value is never read.\n\n6   hello,\n    ~~~~",
      title: 'tsc (TS6133)',
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
        "      Type 'unknown' is not assignable to type 'string'.\n" +
        '\n' +
        '18       error,\n' +
        '         ~~~~~',
      title: 'tsc (TS2769)',
    },
  ];

  const annotation = createTscAnnotations(tscOk, tscOutputStream);

  expect(annotation).toStrictEqual(expectedAnnotations);
});

it('should return an empty array when `tscOk` is true', () => {
  const tscOk = true;
  const output =
    "src/index.ts(6,3): error TS6133: 'test' is declared but its value is never read.\n" +
    'TSFILE: /workdir/skuba/dist/tsconfig.tsbuildinfo\n' +
    '\x1B[0mtsc --noEmit exited with code 2\x1B[0m\n';

  mockOutput.mockReturnValue(output);

  const expectedAnnotations: GitHub.Annotation[] = [];

  const annotation = createTscAnnotations(tscOk, tscOutputStream);

  expect(annotation).toStrictEqual(expectedAnnotations);
});
