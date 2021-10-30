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

it('should create annotations from TSC Output', () => {
  const tscOk = false;
  const output =
    "\x1B[34mtsc      │\x1B[39m src/index.ts(1,1): error TS6133: 'missing' is declared but its value is never read." +
    '\n\n\x1B[34mtsc      │\x1B[39m \x1B[0mtsc --noEmit exited with code 1\x1B[0m';
  mockOutput.mockReturnValue(output);

  const expectedAnnotations: GitHub.Annotation[] = [
    {
      annotation_level: 'failure',
      path: 'src/index.ts',
      start_line: 1,
      end_line: 1,
      start_column: 1,
      end_column: 1,
      message: "TS6133: 'missing' is declared but its value is never read.",
      title: 'tsc',
    },
  ];

  const annotation = createTscAnnotations(tscOk, tscOutputStream);

  expect(annotation).toStrictEqual(expectedAnnotations);
});

it('should return an empty array when tscOk is true', () => {
  const tscOk = true;
  const output =
    "\x1B[34mtsc      │\x1B[39m src/index.ts(1,1): error TS6133: 'missing' is declared but its value is never read." +
    '\n\n\x1B[34mtsc      │\x1B[39m \x1B[0mtsc --noEmit exited with code 1\x1B[0m';
  mockOutput.mockReturnValue(output);

  const expectedAnnotations: GitHub.Annotation[] = [];

  const annotation = createTscAnnotations(tscOk, tscOutputStream);

  expect(annotation).toStrictEqual(expectedAnnotations);
});
