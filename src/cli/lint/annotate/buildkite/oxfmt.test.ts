import { expect, it } from 'vitest';

import type { OxfmtResult } from '../../../adapter/oxfmt.js';

import { createOxfmtAnnotations } from './oxfmt.js';

it('re-prints --check output after the triage heading', () => {
  const oxfmt: OxfmtResult = {
    ok: false,
    output: `Checking formatting...

a.ts (1ms)

Format issues found in above 1 files. Run without \`--check\` to fix.
`,
    errors: [
      {
        path: 'src/index.ts',
        message: 'Oxfmt found formatting issues in this file.',
      },
    ],
  };

  expect(createOxfmtAnnotations(oxfmt)).toEqual([
    '**Oxfmt**',
    `\`\`\`term
Checking formatting...

a.ts (1ms)

Format issues found in above 1 files. Run without \`--check\` to fix.
\`\`\``,
  ]);
});

it('falls back to structured errors when --check output is missing', () => {
  const oxfmt: OxfmtResult = {
    ok: false,
    errors: [
      {
        path: 'src/index.ts',
        message: 'Oxfmt found formatting issues in this file.',
      },
    ],
  };

  expect(createOxfmtAnnotations(oxfmt)).toEqual([
    '**Oxfmt**',
    `\`\`\`term
src/index.ts Oxfmt found formatting issues in this file.
\`\`\``,
  ]);
});

it('creates an empty annotations array if oxfmt succeeded', () => {
  expect(createOxfmtAnnotations({ ok: true })).toEqual([]);
});
