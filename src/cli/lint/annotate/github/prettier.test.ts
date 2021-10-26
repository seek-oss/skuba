import * as GitHub from '../../../../api/github';
import { PrettierOutput } from '../../../../cli/adapter/prettier';

import { createPrettierAnnotations } from './prettier';

it('should create annotations from Prettier errors', () => {
  const prettierOutput: PrettierOutput = {
    ok: false,
    result: {
      errored: [{ filepath: 'src/index.ts' }],
      count: 1,
      touched: [],
      unparsed: [],
    },
  };

  const expectedAnnotations: GitHub.Annotation[] = [
    {
      annotation_level: 'failure',
      start_line: 0,
      end_line: 0,
      path: 'src/index.ts',
      message: 'Prettier found an issue with this file',
    },
  ];

  const annotations = createPrettierAnnotations(prettierOutput);

  expect(annotations).toStrictEqual(expectedAnnotations);
});

it('should create an empty annotations array if there are no errors', () => {
  const prettierOutput: PrettierOutput = {
    ok: true,
    result: {
      errored: [],
      count: 1,
      touched: [],
      unparsed: [],
    },
  };

  const expectedAnnotations: GitHub.Annotation[] = [];

  const annotations = createPrettierAnnotations(prettierOutput);

  expect(annotations).toStrictEqual(expectedAnnotations);
});
