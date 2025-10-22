import { describe, expect, it } from 'vitest';
import ts from 'typescript';

import { assertDefined } from '../testing/module.js';

import {
  createPropAppender,
  createPropFilter,
  readModuleExports,
  transformModuleImportsAndExports,
} from './typescript.js';

const JEST_CONFIG = `export default {
  collectCoverage: true,
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
    },
  },
  preset: 'ts-jest',
  globalSetup: './jest.globalSetup.js',
  setupFilesAfterEnv: ['./jest.setup.js'],
};
`;

describe('transformModuleImportsAndExports', () => {
  const factory = ts.factory;

  it('converts imports', async () => {
    await expect(
      transformModuleImportsAndExports("const abc = require('abc');\n", () =>
        factory.createNodeArray(),
      ),
    ).resolves.toMatchInlineSnapshot(`
      "import abc from 'abc';
      "
    `);

    await expect(
      transformModuleImportsAndExports("const { a } = require('abc');\n", () =>
        factory.createNodeArray(),
      ),
    ).resolves.toMatchInlineSnapshot(`
      "import { a } from 'abc';
      "
    `);

    await expect(
      transformModuleImportsAndExports(
        "const { a, b, c } = require('abc');\n",
        () => factory.createNodeArray(),
      ),
    ).resolves.toMatchInlineSnapshot(`
      "import { a, b, c } from 'abc';
      "
    `);

    await expect(
      transformModuleImportsAndExports("import abc from 'abc';\n", () =>
        factory.createNodeArray(),
      ),
    ).resolves.toMatchInlineSnapshot(`
      "import abc from 'abc';
      "
    `);
  });

  it('detects an object literal export', async () => {
    await expect(
      transformModuleImportsAndExports(
        "module.exports = { key: 'value' };\n",
        () => factory.createNodeArray(),
      ),
    ).resolves.toMatchInlineSnapshot(`
      "export default {};
      "
    `);

    await expect(
      transformModuleImportsAndExports(
        "export default { key: 'value' };\n",
        () => factory.createNodeArray(),
      ),
    ).resolves.toMatchInlineSnapshot(`
      "export default {};
      "
    `);
  });

  it('detects a single-arg call expression export', async () => {
    await expect(
      transformModuleImportsAndExports(
        "export default Jest.mergePreset({ key: 'value' });\n",
        () => factory.createNodeArray(),
      ),
    ).resolves.toMatchInlineSnapshot(`
      "export default Jest.mergePreset({});
      "
    `);

    await expect(
      transformModuleImportsAndExports(
        "module.exports = Jest.mergePreset({ key: 'value' });\n",
        () => factory.createNodeArray(),
      ),
    ).resolves.toMatchInlineSnapshot(`
      "export default Jest.mergePreset({});
      "
    `);
  });

  it('does not transform props of a multi-arg call expression export', async () => {
    await expect(
      transformModuleImportsAndExports(
        "export default Jest.mergePreset({ key: 'value' }, null, 2);\n",
        () => factory.createNodeArray(),
      ),
    ).resolves.toMatchInlineSnapshot(`
      "export default Jest.mergePreset({ key: 'value' }, null, 2);
      "
    `);

    await expect(
      transformModuleImportsAndExports(
        "module.exports = Jest.mergePreset({ key: 'value' }, null, 2);\n",
        () => factory.createNodeArray(),
      ),
    ).resolves.toMatchInlineSnapshot(`
      "export default Jest.mergePreset({ key: 'value' }, null, 2);
      "
    `);
  });

  it('does not transform props of a function export', async () => {
    await expect(
      transformModuleImportsAndExports(
        'export default () => undefined;\n',
        () => factory.createNodeArray(),
      ),
    ).resolves.toMatchInlineSnapshot(`
      "export default () => undefined;
      "
    `);

    await expect(
      transformModuleImportsAndExports(
        'module.exports = () => undefined;\n',
        () => factory.createNodeArray(),
      ),
    ).resolves.toMatchInlineSnapshot(`
      "export default () => undefined;
      "
    `);
  });

  it('ignores a named export', async () =>
    await expect(
      transformModuleImportsAndExports(
        'export const fn = () => undefined;\n',
        () => factory.createNodeArray(),
      ),
    ).resolves.toMatchInlineSnapshot(`
      "export const fn = () => undefined;
      "
    `));

  it('works with a no-op transformer', async () => {
    const result = await transformModuleImportsAndExports(
      JEST_CONFIG,
      (_, props) => props,
    );

    expect(result).toBe(JEST_CONFIG);
  });

  it('works with a prop appender', async () => {
    const append = createPropAppender(
      factory.createNodeArray([
        factory.createPropertyAssignment(
          factory.createIdentifier('globalSetup'),
          factory.createStringLiteral('I should not take precedence'),
        ),
        factory.createPropertyAssignment(
          factory.createIdentifier('a'),
          factory.createStringLiteral('b'),
        ),
      ]),
    );

    const result = await transformModuleImportsAndExports(JEST_CONFIG, append);

    expect(result).toMatchInlineSnapshot(`
      "export default {
        collectCoverage: true,
        coverageThreshold: {
          global: {
            branches: 80,
            functions: 80,
            lines: 80,
          },
        },
        preset: 'ts-jest',
        globalSetup: './jest.globalSetup.js',
        setupFilesAfterEnv: ['./jest.setup.js'],
        a: 'b',
      };
      "
    `);
  });

  it('works with a prop filter', async () => {
    const filter = createPropFilter([
      'coverageThreshold',
      'setupFilesAfterEnv',
      'globalSetup',
    ]);

    const result = await transformModuleImportsAndExports(JEST_CONFIG, filter);

    expect(result).toMatchInlineSnapshot(`
      "export default {
        coverageThreshold: {
          global: {
            branches: 80,
            functions: 80,
            lines: 80,
          },
        },
        globalSetup: './jest.globalSetup.js',
        setupFilesAfterEnv: ['./jest.setup.js'],
      };
      "
    `);
  });
});

describe('readModuleExports', () => {
  it('extracts props from a module.exports expression', async () => {
    const result = await readModuleExports(JEST_CONFIG);

    assertDefined(result);
    expect(result).toHaveLength(5);
    result.forEach((node) => expect(ts.isPropertyAssignment(node)).toBe(true));
  });
});
