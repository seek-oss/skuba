import { expect, it } from 'vitest';

import type { OxfmtResult } from '../../../adapter/oxfmt.js';

import { createOxfmtAnnotations } from './oxfmt.js';

import type * as GitHub from '@skuba-lib/api/github';

it('should create annotations from oxfmt formatting issues', () => {
  const oxfmtOutput: OxfmtResult = {
    ok: false,
    errors: [
      {
        path: 'src/index.ts',
        message: 'Oxfmt found formatting issues in this file.',
      },
    ],
  };

  const expectedAnnotations: GitHub.Annotation[] = [
    {
      annotation_level: 'failure',
      start_line: 1,
      end_line: 1,
      path: 'src/index.ts',
      message: 'Oxfmt found formatting issues in this file.',
      title: 'Oxfmt',
    },
  ];

  const annotations = createOxfmtAnnotations(oxfmtOutput);

  expect(annotations).toStrictEqual(expectedAnnotations);
});

it('should create an empty annotations array if there are no errors', () => {
  const oxfmtOutput: OxfmtResult = {
    ok: true,
  };

  const expectedAnnotations: GitHub.Annotation[] = [];

  const annotations = createOxfmtAnnotations(oxfmtOutput);

  expect(annotations).toStrictEqual(expectedAnnotations);
});

it('should create annotations from oxfmt parse errors', () => {
  const oxfmtOutput: OxfmtResult = {
    ok: false,
    errors: [
      {
        path: 'src/evil.ts',
        message:
          'Oxlint errored while checking this file.\n\n  × Unexpected token\n',
        position: { line: 1, column: 11 },
      },
    ],
  };

  const expectedAnnotations: GitHub.Annotation[] = [
    {
      annotation_level: 'failure',
      start_line: 1,
      end_line: 1,
      start_column: 11,
      end_column: 11,
      path: 'src/evil.ts',
      message:
        'Oxlint errored while checking this file.\n\n  × Unexpected token\n',
      title: 'Oxfmt',
    },
  ];

  const annotations = createOxfmtAnnotations(oxfmtOutput);

  expect(annotations).toStrictEqual(expectedAnnotations);
});
