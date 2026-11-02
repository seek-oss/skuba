import { describe, expect, it } from 'vitest';

import { type TsconfigLibOptions, patchTsconfigLib } from './tsconfigLib.js';

const tsconfig = (lib: string) =>
  `{\n  "compilerOptions": {\n    "lib": ${lib},\n    "target": "ES2024"\n  }\n}\n`;

describe('patchTsconfigLib', () => {
  const scenarios: Array<{
    scenario: string;
    before: string;
    after?: string;
    options?: Partial<TsconfigLibOptions>;
  }> = [
    {
      scenario: 'bumps a base lib below the target',
      before: tsconfig('["ES2020"]'),
      after: tsconfig('["ES2024"]'),
    },
    {
      scenario: 'bumps a lowercase and numbered base lib',
      before: tsconfig('["es6", "dom"]'),
      after: tsconfig('["ES2024", "dom"]'),
    },
    {
      scenario: 'dedupes base libs that bump to the same version',
      before: tsconfig('["ES2020", "ES2022"]'),
      after: tsconfig('["ES2024"]'),
    },
    {
      scenario: 'leaves a base lib above the target',
      before: tsconfig('["ES2025"]'),
    },
    {
      scenario: 'drops sub-libs covered by the base lib',
      before: tsconfig('["ES2022", "ES2023.Array", "ES2024.Promise", "dom"]'),
      after: tsconfig('["ES2024", "dom"]'),
    },
    {
      scenario: 'keeps sub-libs newer than the base lib',
      before: tsconfig('["ES2024", "ES2025.Iterator"]'),
    },
    {
      scenario: 'keeps sub-libs when there is no base lib to cover them',
      before: tsconfig('["ES2023.Array", "dom"]'),
    },
    {
      scenario: 'drops libs in the remove list',
      before: tsconfig('["ES2024", "esnext.iterator", "dom"]'),
      after: tsconfig('["ES2024", "dom"]'),
      options: { remove: ['ESNext.Iterator'] },
    },
    {
      scenario: 'appends libs in the add list',
      before: tsconfig('["ES2024"]'),
      after: tsconfig('["ES2024", "ES2025.Iterator", "ESNext.Disposable"]'),
      options: { add: ['ES2025.Iterator', 'ESNext.Disposable'] },
    },
    {
      scenario: 'does not duplicate libs that differ only in case',
      before: tsconfig('["ES2024", "esnext.disposable"]'),
      options: { add: ['ESNext.Disposable'] },
    },
    {
      scenario: 'skips additions when ESNext is present',
      before: tsconfig('["ESNext"]'),
      options: { add: ['ESNext.Disposable'] },
    },
    {
      scenario: 'skips additions covered by the base lib',
      before: tsconfig('["ES2020"]'),
      after: tsconfig('["ES2024", "ESNext.Disposable"]'),
      options: { add: ['ES2024.Promise', 'ESNext.Disposable'] },
    },
    {
      scenario: 'bumps alongside ESNext',
      before: tsconfig('["ESNext", "ES2020"]'),
      after: tsconfig('["ESNext", "ES2024"]'),
    },
    {
      scenario: 'preserves multi-line formatting',
      before: tsconfig(
        '[\n      "ES2022",\n      "ES2023.Array",\n      "dom"\n    ]',
      ),
      after: tsconfig(
        '[\n      "ES2024",\n      "dom",\n      "ESNext.Disposable"\n    ]',
      ),
      options: { add: ['ESNext.Disposable'] },
    },
    {
      scenario: 'preserves multi-line formatting for a single element',
      before: tsconfig('[\n      "ES2022"\n    ]'),
      after: tsconfig('[\n      "ES2024",\n      "ESNext.Disposable"\n    ]'),
      options: { add: ['ESNext.Disposable'] },
    },
    {
      scenario: 'patches JSONC with comments outside the lib array',
      before:
        '{\n  // Comment\n  "compilerOptions": {\n    /* Libs */\n    "lib": ["ES2022"],\n  },\n}\n',
      after:
        '{\n  // Comment\n  "compilerOptions": {\n    /* Libs */\n    "lib": ["ES2024"],\n  },\n}\n',
    },
    {
      scenario: 'patches a tsconfig with non-ASCII characters',
      before:
        '{\n  // ✨ héllo 🚀\n  "compilerOptions": {\n    "lib": [\n      "ES2022",\n      "dom"\n    ]\n  }\n}\n',
      after:
        '{\n  // ✨ héllo 🚀\n  "compilerOptions": {\n    "lib": [\n      "ES2024",\n      "dom",\n      "ESNext.Error"\n    ]\n  }\n}\n',
      options: { add: ['ESNext.Error'] },
    },
    {
      scenario: 'leaves a lib array containing comments',
      before: tsconfig('[\n      "ES2022", // Node.js 18\n      "dom"\n    ]'),
    },
    {
      scenario: 'leaves a tsconfig without lib',
      before: '{\n  "compilerOptions": {\n    "target": "ES2020"\n  }\n}\n',
      options: { add: ['ESNext.Disposable'] },
    },
    {
      scenario: 'leaves a non-array lib',
      before: tsconfig('"ES2020"'),
    },
    {
      scenario: 'leaves an empty lib array',
      before: tsconfig('[]'),
      options: { add: ['ESNext.Disposable'] },
    },
    {
      scenario: 'leaves a lib outside compilerOptions',
      before: '{\n  "lib": ["ES2020"]\n}\n',
    },
  ];

  it.each(scenarios)('$scenario', async ({ before, after, options }) => {
    await expect(
      patchTsconfigLib(before, { ECMAScriptVersion: 'ES2024', ...options }),
    ).resolves.toBe(after ?? before);
  });
});
