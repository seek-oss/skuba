import { expect, it } from 'vitest';
import type { PrettierOutput } from '../../../adapter/prettier.js';

import { createPrettierAnnotations } from './prettier.js';

import type * as GitHub from '@skuba-lib/api/github';

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
      start_line: 1,
      end_line: 1,
      path: 'src/index.ts',
      message: 'This file has not been formatted.',
      title: 'Prettier',
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

it('should create annotations Prettier process errors', () => {
  const prettierOutput: PrettierOutput = {
    ok: false,
    result: {
      errored: [
        { err: new Error('OMG Prettier crashed'), filepath: 'src/evil.ts' },
      ],
      count: 1,
      touched: [],
      unparsed: [],
    },
  };

  const expectedAnnotations: GitHub.Annotation[] = [
    {
      annotation_level: 'failure',
      start_line: 1,
      end_line: 1,
      path: 'src/evil.ts',
      message: 'OMG Prettier crashed',
      title: 'Prettier',
    },
  ];

  const annotations = createPrettierAnnotations(prettierOutput);

  expect(annotations).toStrictEqual(expectedAnnotations);
});
