import os from 'os';
import path from 'path';

import fs from 'fs-extra';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { editLifeCycleHooks } from './lifeCycleEdits.js';

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
  await editLifeCycleHooks([
    {
      file: tmpFile,
      content,
    },
  ]);
  return fs.promises.readFile(tmpFile, 'utf8');
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
