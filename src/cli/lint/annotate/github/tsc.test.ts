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
    "\u001b[34mtsc      │\u001b[39m \u001b[96msrc/skuba.ts\u001b[0m:\u001b[93m6\u001b[0m:\u001b[93m20\u001b[0m - \u001b[91merror\u001b[0m\u001b[90m TS2307: \u001b[0mCannot find module './bla' or its corresponding type declarations.\n\u001b[34mtsc      │\u001b[39m \n\u001b[34mtsc      │\u001b[39m \u001b[7m6\u001b[0m import {test} from './bla';\n\u001b[34mtsc      │\u001b[39m \u001b[7m \u001b[0m \u001b[91m                   ~~~~~~~\u001b[0m\n\u001b[34mtsc      │\u001b[39m \n\u001b[34mtsc      │\u001b[39m \n\u001b[34mtsc      │\u001b[39m Found 1 error.\n\u001b[34mtsc      │\u001b[39m \n\u001b[34mtsc      │\u001b[39m \u001b[0mtsc --noEmit exited with code 2\u001b[0m\n";
  mockOutput.mockReturnValue(output);

  const expectedAnnotations: GitHub.Annotation[] = [
    {
      annotation_level: 'failure',
      path: 'src/skuba.ts',
      start_line: 6,
      end_line: 6,
      start_column: 20,
      end_column: 20,
      message:
        "TS2307: Cannot find module './bla' or its corresponding type declarations.",
      title: 'tsc',
    },
  ];

  const annotation = createTscAnnotations(tscOk, tscOutputStream);

  expect(annotation).toStrictEqual(expectedAnnotations);
});

it('should return an empty array when tscOk is true', () => {
  const tscOk = true;
  const output =
    "\u001b[34mtsc      │\u001b[39m \u001b[96msrc/skuba.ts\u001b[0m:\u001b[93m6\u001b[0m:\u001b[93m20\u001b[0m - \u001b[91merror\u001b[0m\u001b[90m TS2307: \u001b[0mCannot find module './bla' or its corresponding type declarations.\n\u001b[34mtsc      │\u001b[39m \n\u001b[34mtsc      │\u001b[39m \u001b[7m6\u001b[0m import {test} from './bla';\n\u001b[34mtsc      │\u001b[39m \u001b[7m \u001b[0m \u001b[91m                   ~~~~~~~\u001b[0m\n\u001b[34mtsc      │\u001b[39m \n\u001b[34mtsc      │\u001b[39m \n\u001b[34mtsc      │\u001b[39m Found 1 error.\n\u001b[34mtsc      │\u001b[39m \n\u001b[34mtsc      │\u001b[39m \u001b[0mtsc --noEmit exited with code 2\u001b[0m\n";

  mockOutput.mockReturnValue(output);

  const expectedAnnotations: GitHub.Annotation[] = [];

  const annotation = createTscAnnotations(tscOk, tscOutputStream);

  expect(annotation).toStrictEqual(expectedAnnotations);
});
