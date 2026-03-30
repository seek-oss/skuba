import { describe, expect, it } from 'vitest';

import { migrateAsyncHooks } from './typescript.js';

const FILE_PATH = 'test.ts';

describe('migrateAsyncHooks', () => {
  it('returns content unchanged when there are no lifecycle hooks', async () => {
    const content = `const someFunction = async () => {};

someFunction();
`;

    await expect(migrateAsyncHooks(FILE_PATH, content)).resolves.toBe(content);
  });

  it('returns content unchanged when the hook callback is already async', async () => {
    const content = `const someFunction = async () => {};

beforeEach(async () => {
  await someFunction();
});
`;

    await expect(migrateAsyncHooks(FILE_PATH, content)).resolves.toBe(content);
  });

  it('returns content unchanged when the hook callback calls a sync function', async () => {
    const content = `const someFunction = () => {};

beforeEach(() => {
  someFunction();
});
`;

    await expect(migrateAsyncHooks(FILE_PATH, content)).resolves.toBe(content);
  });

  it('adds async and await when a hook callback calls an async arrow function', async () => {
    const content = `const someFunction = async () => {};

beforeEach(() => {
  someFunction();
});
`;

    await expect(migrateAsyncHooks(FILE_PATH, content)).resolves.toBe(
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

    await expect(migrateAsyncHooks(FILE_PATH, content)).resolves.toBe(
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

  it('adds a single async and multiple awaits when a callback calls multiple async functions', async () => {
    const content = `const foo = async () => {};
const bar = async () => {};

beforeEach(() => {
  foo();
  bar();
});
`;

    await expect(migrateAsyncHooks(FILE_PATH, content)).resolves.toBe(
      `const foo = async () => {};
const bar = async () => {};

beforeEach(async () => {
  await foo();
  await bar();
});
`,
    );
  });

  it('only awaits async calls and leaves sync calls untouched in the same callback', async () => {
    const content = `const asyncFn = async () => {};
const syncFn = () => {};

beforeEach(() => {
  syncFn();
  asyncFn();
});
`;

    await expect(migrateAsyncHooks(FILE_PATH, content)).resolves.toBe(
      `const asyncFn = async () => {};
const syncFn = () => {};

beforeEach(async () => {
  syncFn();
  await asyncFn();
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

    await expect(migrateAsyncHooks(FILE_PATH, content)).resolves.toBe(content);
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

    await expect(migrateAsyncHooks(FILE_PATH, content)).resolves.toBe(
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
});
