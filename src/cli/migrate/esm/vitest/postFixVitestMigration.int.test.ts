import os from 'os';
import path from 'path';

import fs from 'fs-extra';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { postFixVitestMigration } from './postFixVitestMigration.js';

let tmpFile: string;
let tmpModuleFile: string;

beforeEach(() => {
  const id = Date.now();
  tmpFile = path.join(os.tmpdir(), `jestHooks-test-${id}.ts`);
  tmpModuleFile = path.join(os.tmpdir(), `jestHooks-module-${id}.ts`);
});

afterEach(async () => {
  await Promise.all([fs.remove(tmpFile), fs.remove(tmpModuleFile)]);
});

const run = async (content: string) => {
  await fs.promises.writeFile(tmpFile, content, 'utf8');
  return postFixVitestMigration(tmpFile, content);
};

describe('migrateAsyncHooks', () => {
  it('returns content unchanged when there are no lifecycle hooks', async () => {
    const content = `const someFunction = async () => {};

someFunction();
`;

    await expect(run(content)).resolves.toBe(content);
  });

  it('returns content unchanged when the hook callback is already async', async () => {
    const content = `const someFunction = async () => {};

beforeEach(async () => {
  await someFunction();
});
`;

    await expect(run(content)).resolves.toBe(content);
  });

  it('returns content unchanged when the hook callback contains arguments', async () => {
    const content = `const someFunction = async () => {};

beforeEach(async () => {
  someFunction('123');
});
`;

    await expect(run(content)).resolves.toBe(content);
  });

  it('returns content unchanged when the hook callback calls a sync function', async () => {
    const content = `const someFunction = () => {};

beforeEach(() => {
  someFunction();
});
`;

    await expect(run(content)).resolves.toBe(content);
  });

  it('adds async and await when a hook callback calls an async arrow function', async () => {
    const content = `const someFunction = async () => {};

beforeEach(() => {
  someFunction();
});
`;

    await expect(run(content)).resolves.toBe(
      `const someFunction = async () => {};

beforeEach(async () => {
  await someFunction();
});
`,
    );
  });

  it('adds async and await for afterEach, beforeAll, and afterAll hooks', async () => {
    const content = `const setup = async () => {};
const teardown = async () => {};

afterEach(() => {
  teardown();
});

beforeAll(() => {
  setup();
});

afterAll(() => {
  teardown();
});
`;

    await expect(run(content)).resolves.toBe(
      `const setup = async () => {};
const teardown = async () => {};

afterEach(async () => {
  await teardown();
});

beforeAll(async () => {
  await setup();
});

afterAll(async () => {
  await teardown();
});
`,
    );
  });

  it('does not re-await calls that are already awaited', async () => {
    const content = `const someFunction = async () => {};

beforeEach(async () => {
  await someFunction();
});
`;

    await expect(run(content)).resolves.toBe(content);
  });

  it('handles multiple hooks independently', async () => {
    const content = `const asyncFn = async () => {};

beforeEach(() => {
  asyncFn();
});

afterEach(() => {
  asyncFn();
});
`;

    await expect(run(content)).resolves.toBe(
      `const asyncFn = async () => {};

beforeEach(async () => {
  await asyncFn();
});

afterEach(async () => {
  await asyncFn();
});
`,
    );
  });

  it('handles unfixed lifecycle hooks', async () => {
    const content = `beforeEach(vi.resetAllMocks);
afterAll(vi.clearAllMocks);
`;

    await expect(run(content)).resolves.toBe(
      `beforeEach(() => { vi.resetAllMocks() });
afterAll(() => { vi.clearAllMocks() });
`,
    );
  });

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

  it('handles inline single-line hook callbacks', async () => {
    const content = `const resetDynamoDb = async () => {};
const seedAdProductMappings = async () => {};
const resetAdProductsDynamoDb = async () => {};

beforeEach(() => { resetDynamoDb() });
beforeAll(() => { seedAdProductMappings() });
afterAll(() => { resetAdProductsDynamoDb() });
`;

    await expect(run(content)).resolves.toBe(
      `const resetDynamoDb = async () => {};
const seedAdProductMappings = async () => {};
const resetAdProductsDynamoDb = async () => {};

beforeEach(async () => { await resetDynamoDb() });
beforeAll(async () => { await seedAdProductMappings() });
afterAll(async () => { await resetAdProductsDynamoDb() });
`,
    );
  });

  it('does not make the outer callback async when only a nested function contains a promise', async () => {
    const content = `beforeEach(() => {
  const mock = {
    thing: () => Promise.resolve(),
  };
});
`;

    await expect(run(content)).resolves.toBe(content);
  });

  it('handles hooks calling imported async functions', async () => {
    await fs.promises.writeFile(
      tmpModuleFile,
      `export const resetDynamoDb = async () => {};
`,
      'utf8',
    );

    const relativeImport = `./${path.basename(tmpModuleFile, '.ts')}`;
    const content = `import { resetDynamoDb } from '${relativeImport}';

beforeEach(() => {
  resetDynamoDb();
});
`;

    await expect(run(content)).resolves.toBe(
      `import { resetDynamoDb } from '${relativeImport}';

beforeEach(async () => {
  await resetDynamoDb();
});
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

const someModule = vi.importActual<typeof import('./someModule')>('./someModule');
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
