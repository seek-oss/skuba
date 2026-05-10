import { describe, expect, it } from 'vitest';

import { postFixVitestMigration } from './postFixVitestMigration.js';

const run = async (content: string) => {
  const result = await postFixVitestMigration('test.ts', content);
  return result.updated;
};

describe('postFixVitestMigration', () => {
  describe('migrateReturningHooks', () => {
    it('handles unfixed immediate return lifecycle hooks', async () => {
      const content = `beforeEach(() => vi.resetAllMocks());
afterAll(() => vi.clearAllMocks());
`;

      await expect(run(content)).resolves.toBe(
        `beforeEach(() => { vi.resetAllMocks() });
afterAll(() => { vi.clearAllMocks() });
`,
      );
    });
  });

  describe('migrateVimockOrder', () => {
    it('returns content unchanged when the vitest import is not first', async () => {
      const content = `import { foo } from './foo';
import { vi } from 'vitest';
vi.mock('./foo');
import { bar } from './bar';
`;

      await expect(run(content)).resolves.toBe(content);
    });

    it('returns content unchanged when nothing follows the vitest import', async () => {
      const content = `import { vi } from 'vitest';
`;

      await expect(run(content)).resolves.toBe(content);
    });

    it('returns content unchanged when the next statement is a regular import', async () => {
      const content = `import { vi } from 'vitest';
import { foo } from './foo';
`;

      await expect(run(content)).resolves.toBe(content);
    });

    it('moves the vitest import after a call expression', async () => {
      const content = `import { vi } from 'vitest';
doSomething('./foo');
import { foo } from './foo';
`;

      await expect(run(content)).resolves.toBe(
        `doSomething('./foo');
import { vi } from 'vitest';
import { foo } from './foo';
`,
      );
    });

    it('moves the vitest import after multiple call expressions', async () => {
      const content = `import { vi } from 'vitest';
doSomething('./a');
doSomething('./b');
import { a } from './a';
import { b } from './b';
`;

      await expect(run(content)).resolves.toBe(
        `doSomething('./a');
doSomething('./b');
import { vi } from 'vitest';
import { a } from './a';
import { b } from './b';
`,
      );
    });

    it('does not move the vitest import when no regular imports follow', async () => {
      const content = `import { vi } from 'vitest';
doSomething('./foo');
`;

      await expect(run(content)).resolves.toBe(content);
    });

    it('moves the vitest import when a vi.mock call follows', async () => {
      const content = `import { vi } from 'vitest';
vi.mock('./foo');
import { foo } from './foo';
`;

      await expect(run(content)).resolves.toBe(`vi.mock('./foo');
import { vi } from 'vitest';
import { foo } from './foo';
`);
    });

    it('preserves blank lines between vi.mock and the following import', async () => {
      const content = `import { vi } from 'vitest';
doSomething('./foo');

import { foo } from './foo';
`;

      await expect(run(content)).resolves.toBe(
        `doSomething('./foo');

import { vi } from 'vitest';
import { foo } from './foo';
`,
      );
    });

    it('moves the vitest import after a side-effectful import', async () => {
      const content = `import { vi } from 'vitest';
import 'some-side-effect';
import { foo } from './foo';
`;

      await expect(run(content)).resolves.toBe(
        `import 'some-side-effect';
import { vi } from 'vitest';
import { foo } from './foo';
`,
      );
    });

    it('moves the vitest import after a mixed block of side-effectful imports and vi.mock calls', async () => {
      const content = `import { vi } from 'vitest';
import 'some-side-effect';
vi.mock('./a');
import { a } from './a';
`;

      await expect(run(content)).resolves.toMatchInlineSnapshot(`
        "import 'some-side-effect';
        vi.mock('./a');
        import { vi } from 'vitest';
        import { a } from './a';
        "
      `);
    });

    it('moves the import after an eslint-disable-next-line comment import', async () => {
      const content = `import { vi } from 'vitest';
// eslint-disable-next-line some-rule
import { foo } from './foo';
import { another } from './another';
`;

      await expect(run(content)).resolves.toMatchInlineSnapshot(`
        "// eslint-disable-next-line some-rule
        import { foo } from './foo';
        import { vi } from 'vitest';
        import { another } from './another';
        "
      `);
    });
  });

  describe('migrateViMockPrototype', () => {
    it('should set vi.mocked() prototypes to deep mocks', async () => {
      const content = `import { vi } from 'vitest';

const mockedModule = vi.mocked(someModule).prototype;

const multiLineMock = vi.mocked(
  someModule.other,
).prototype;
`;

      await expect(run(content)).resolves.toMatchInlineSnapshot(`
        "import { vi } from 'vitest';

        const mockedModule = vi.mocked(someModule,true).prototype;

        const multiLineMock = vi.mocked(
          someModule.other,
        true).prototype;
        "
      `);
    });
  });

  describe('migrateBadMocks', () => {
    it('migrates nested vi.mock calls to vi.doMock', async () => {
      const content = `import { vi } from 'vitest';
vi.mock('./should-not-change');

describe('some test suite', () => {
  vi.mock('./should-change');

  it('some test case', () => {
    vi.mock('./should-also-change');
  });
});

vi.mock('./should-also-not-change');
`;

      await expect(run(content)).resolves.toBe(`import { vi } from 'vitest';
vi.mock('./should-not-change');

describe('some test suite', () => {
  vi.doMock('./should-change');

  it('some test case', () => {
    vi.doMock('./should-also-change');
  });
});

vi.mock('./should-also-not-change');
`);
    });
  });

  describe('migrateImportActual', () => {
    it('adds type parameters to vi.importActual calls', async () => {
      const content = `import { vi } from 'vitest';

const someModule = vi.importActual('./someModule');
`;

      await expect(run(content)).resolves.toBe(`import { vi } from 'vitest';

const someModule = (vi.importActual<typeof import('./someModule')>('./someModule'));
`);
    });

    it('does not modify vi.importActual calls that already have type parameters', async () => {
      const content = `import { vi } from 'vitest';

const someModule = vi.importActual<typeof import('./someModule')>('./someModule');
`;

      await expect(run(content)).resolves.toBe(content);
    });
  });

  describe('migrateJestTypes', () => {
    it('adds imports for Mock, MockedFunction, MockedClass, MockedObject, and MockInstance when those types are used', async () => {
      const content = `import { vi } from 'vitest';

type MyMock = jest.Mock;
type MyMockedFunction = jest.MockedFunction<() => void>;
type MyMockedClass = jest.MockedClass<typeof SomeClass>;
type MyMockedObject = jest.MockedObject<{ foo: string }>;
type MyMockInstance = jest.MockInstance<{ bar: number }>;
type MySpy = jest.SpyInstance;
type MySpiedFunction = jest.SpiedFunction<() => void>;
`;

      await expect(run(content)).resolves.toBe(`import { vi } from 'vitest';
import type { Mock, MockedFunction, MockedClass, MockedObject, MockInstance } from 'vitest';

type MyMock = Mock;
type MyMockedFunction = MockedFunction<() => void>;
type MyMockedClass = MockedClass<typeof SomeClass>;
type MyMockedObject = MockedObject<{ foo: string }>;
type MyMockInstance = MockInstance<{ bar: number }>;
type MySpy = MockInstance;
type MySpiedFunction = Mock<() => void>;
`);
    });
  });

  describe('migrateBadMockImplementations', () => {
    it('removes bad .mockImplementation() from vi.mock calls', async () => {
      const content = `import { vi } from 'vitest';

vi.mock('./someModule').mockImplementation().mockReturnValue(42);

someModule.mockImplementation().mockReturnValue(42);

const mockedModule = vi.mocked(someModule).mockImplementation().mockRejectedValue(new Error('oops'));

mock.mockImplementation();

// preserved
mock.mockImplementation().mockReset();

foo
  .mockImplementation()
  .mockReturnValue(42);
`;

      await expect(run(content)).resolves.toBe(`import { vi } from 'vitest';

vi.mock('./someModule').mockReturnValue(42);

someModule.mockReturnValue(42);

const mockedModule = vi.mocked(someModule).mockRejectedValue(new Error('oops'));

mock.mockImplementation();

// preserved
mock.mockImplementation().mockReset();

foo
  .mockReturnValue(42);
`);
    });
  });
});
