import ts from 'typescript';

import { assertDefined } from '../testing/module';

import {
  createPropAppender,
  createPropFilter,
  readModuleExports,
  transformModuleImportsAndExports,
} from './typescript';

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

  it('converts imports', () => {
    expect(
      transformModuleImportsAndExports("const abc = require('abc');\n", () =>
        factory.createNodeArray(),
      ),
    ).toMatchInlineSnapshot(`
      "import abc from 'abc';
      "
    `);

    expect(
      transformModuleImportsAndExports("const { a } = require('abc');\n", () =>
        factory.createNodeArray(),
      ),
    ).toMatchInlineSnapshot(`
      "import { a } from 'abc';
      "
    `);

    expect(
      transformModuleImportsAndExports(
        "const { a, b, c } = require('abc');\n",
        () => factory.createNodeArray(),
      ),
    ).toMatchInlineSnapshot(`
      "import { a, b, c } from 'abc';
      "
    `);

    expect(
      transformModuleImportsAndExports("import abc from 'abc';\n", () =>
        factory.createNodeArray(),
      ),
    ).toMatchInlineSnapshot(`
      "import abc from 'abc';
      "
    `);
  });

  it('detects an object literal export', () => {
    expect(
      transformModuleImportsAndExports(
        "module.exports = { key: 'value' };\n",
        () => factory.createNodeArray(),
      ),
    ).toMatchInlineSnapshot(`
      "export default {};
      "
    `);

    expect(
      transformModuleImportsAndExports(
        "export default { key: 'value' };\n",
        () => factory.createNodeArray(),
      ),
    ).toMatchInlineSnapshot(`
      "export default {};
      "
    `);
  });

  it('detects a single-arg call expression export', () => {
    expect(
      transformModuleImportsAndExports(
        "export default Jest.mergePreset({ key: 'value' });\n",
        () => factory.createNodeArray(),
      ),
    ).toMatchInlineSnapshot(`
      "export default Jest.mergePreset({});
      "
    `);

    expect(
      transformModuleImportsAndExports(
        "module.exports = Jest.mergePreset({ key: 'value' });\n",
        () => factory.createNodeArray(),
      ),
    ).toMatchInlineSnapshot(`
      "export default Jest.mergePreset({});
      "
    `);
  });

  it('does not transform props of a multi-arg call expression export', () => {
    expect(
      transformModuleImportsAndExports(
        "export default Jest.mergePreset({ key: 'value' }, null, 2);\n",
        () => factory.createNodeArray(),
      ),
    ).toMatchInlineSnapshot(`
      "export default Jest.mergePreset({ key: 'value' }, null, 2);
      "
    `);

    expect(
      transformModuleImportsAndExports(
        "module.exports = Jest.mergePreset({ key: 'value' }, null, 2);\n",
        () => factory.createNodeArray(),
      ),
    ).toMatchInlineSnapshot(`
      "export default Jest.mergePreset({ key: 'value' }, null, 2);
      "
    `);
  });

  it('does not transform props of a function export', () => {
    expect(
      transformModuleImportsAndExports(
        'export default () => undefined;\n',
        () => factory.createNodeArray(),
      ),
    ).toMatchInlineSnapshot(`
      "export default () => undefined;
      "
    `);

    expect(
      transformModuleImportsAndExports(
        'module.exports = () => undefined;\n',
        () => factory.createNodeArray(),
      ),
    ).toMatchInlineSnapshot(`
      "export default () => undefined;
      "
    `);
  });

  it('ignores a named export', () =>
    expect(
      transformModuleImportsAndExports(
        'export const fn = () => undefined;\n',
        () => factory.createNodeArray(),
      ),
    ).toMatchInlineSnapshot(`
      "export const fn = () => undefined;
      "
    `));

  it('works with a no-op transformer', () => {
    const result = transformModuleImportsAndExports(
      JEST_CONFIG,
      (_, props) => props,
    );

    expect(result).toBe(JEST_CONFIG);
  });

  it('works with a prop appender', () => {
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

    const result = transformModuleImportsAndExports(JEST_CONFIG, append);

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

  it('works with a prop filter', () => {
    const filter = createPropFilter([
      'coverageThreshold',
      'setupFilesAfterEnv',
      'globalSetup',
    ]);

    const result = transformModuleImportsAndExports(JEST_CONFIG, filter);

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
