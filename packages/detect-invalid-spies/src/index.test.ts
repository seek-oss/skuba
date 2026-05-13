import os from 'node:os';
import path from 'node:path';

import fs from 'fs-extra';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { detectSameFileSpyUsage } from './index.js';

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'detect-invalid-spies-'));
  // Write a minimal tsconfig so ts.resolveModuleName uses simple classic
  // node module resolution within the temp directory, isolated from the
  // project tsconfig that uses Node16.
  await fs.promises.writeFile(
    path.join(tmpDir, 'tsconfig.json'),
    JSON.stringify({
      compilerOptions: {
        moduleResolution: 'node',
        strict: true,
      },
    }),
    'utf8',
  );
});

afterEach(async () => {
  await fs.remove(tmpDir);
});

const write = (name: string, content: string) =>
  fs.promises.writeFile(path.join(tmpDir, name), content, 'utf8');

describe('detectSameFileSpyUsage', () => {
  it('returns empty array for an empty directory', async () => {
    await expect(detectSameFileSpyUsage(tmpDir)).resolves.toEqual([]);
  });

  it('returns empty array when no spy calls are present', async () => {
    await write(
      'http.ts',
      `
export const createServiceAuthHeaders = () => ({ authorization: 'Bearer token' });
`,
    );

    await expect(detectSameFileSpyUsage(tmpDir)).resolves.toEqual([]);
  });

  it('warns when jest.spyOn targets a function that is called internally', async () => {
    await write(
      'http.ts',
      `
export const createServiceAuthHeaders = () => ({ authorization: 'Bearer token' });

export const createServiceAuthClient = () => {
  const headers = createServiceAuthHeaders('audience');
  return headers;
};
`,
    );

    await write(
      'spy.ts',
      `
import * as s2s from './http';

export const mockServiceAuthHeaders = () =>
  jest.spyOn(s2s, 'createServiceAuthHeaders').mockReturnValue({ authorization: 'Bearer mock' });
`,
    );

    const warnings = await detectSameFileSpyUsage(tmpDir);

    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toMatchObject({
      importSpecifier: './http',
      spiedFunction: 'createServiceAuthHeaders',
      resolvedFile: path.join(tmpDir, 'http.ts'),
      reason: 'internal-usage-in-module',
    });
  });

  it('warns when vi.spyOn targets a function that is called internally', async () => {
    await write(
      'http.ts',
      `
export const createServiceAuthHeaders = () => ({ authorization: 'Bearer token' });

export const createServiceAuthClient = () => {
  const headers = createServiceAuthHeaders('audience');
  return headers;
};
`,
    );

    await write(
      'spy.ts',
      `
import * as s2s from './http';

export const mockServiceAuthHeaders = () =>
  vi.spyOn(s2s, 'createServiceAuthHeaders').mockReturnValue({ authorization: 'Bearer mock' });
`,
    );

    const warnings = await detectSameFileSpyUsage(tmpDir);

    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toMatchObject({
      importSpecifier: './http',
      spiedFunction: 'createServiceAuthHeaders',
      reason: 'internal-usage-in-module',
    });
  });

  it('does not warn when the spied function is only declared but not called internally', async () => {
    await write(
      'http.ts',
      `
export const createServiceAuthHeaders = () => ({ authorization: 'Bearer token' });

export const createServiceAuthClient = () => 'unrelated';
`,
    );

    await write(
      'spy.ts',
      `
import * as s2s from './http';

export const mockServiceAuthHeaders = () =>
  jest.spyOn(s2s, 'createServiceAuthHeaders').mockReturnValue({ authorization: 'Bearer mock' });
`,
    );

    await expect(detectSameFileSpyUsage(tmpDir)).resolves.toEqual([]);
  });

  it('does not warn when the module specifier cannot be resolved', async () => {
    await write(
      'spy.ts',
      `
import * as gone from './nonexistent-module';

export const mock = () =>
  jest.spyOn(gone, 'doSomething').mockReturnValue(undefined);
`,
    );

    await expect(detectSameFileSpyUsage(tmpDir)).resolves.toEqual([]);
  });

  it('does not warn when the import is a named import rather than a namespace import', async () => {
    await write(
      'http.ts',
      `
export const doThing = () => 'x';
export const caller = () => doThing();
`,
    );

    // Named import — jest.spyOn cannot intercept this pattern anyway,
    // but the detector should not flag it because there is no namespace import.
    await write(
      'spy.ts',
      `
import { doThing } from './http';

export const mock = () =>
  jest.spyOn(doThing, 'bind').mockReturnValue(doThing);
`,
    );

    await expect(detectSameFileSpyUsage(tmpDir)).resolves.toEqual([]);
  });

  it('does not warn when the function only appears in a type position in the source module', async () => {
    await write(
      'http.ts',
      `
export const doThing = () => 'x';
export type DoThingFn = typeof doThing;
`,
    );

    await write(
      'spy.ts',
      `
import * as http from './http';

export const mock = () =>
  jest.spyOn(http, 'doThing').mockReturnValue('mocked');
`,
    );

    await expect(detectSameFileSpyUsage(tmpDir)).resolves.toEqual([]);
  });

  it('does not warn when the function is only re-exported via export specifier', async () => {
    await write(
      'impl.ts',
      `
export const doThing = () => 'x';
`,
    );

    // http.ts just re-exports; doThing is not called internally here.
    await write(
      'http.ts',
      `
import { doThing } from './impl';
export { doThing };
`,
    );

    await write(
      'spy.ts',
      `
import * as http from './http';

export const mock = () =>
  jest.spyOn(http, 'doThing').mockReturnValue('mocked');
`,
    );

    await expect(detectSameFileSpyUsage(tmpDir)).resolves.toEqual([]);
  });

  it('reports multiple warnings when multiple spied functions are each used internally', async () => {
    await write(
      'api.ts',
      `
export const fetchUser = async (id: string) => ({ id });
export const fetchPost = async (id: string) => ({ id });

export const fetchUserAndPost = async (id: string) => {
  const user = await fetchUser(id);
  const post = await fetchPost(id);
  return { user, post };
};
`,
    );

    await write(
      'spy.ts',
      `
import * as api from './api';

export const mockFetchUser = () =>
  jest.spyOn(api, 'fetchUser').mockResolvedValue({ id: 'u1' });

export const mockFetchPost = () =>
  jest.spyOn(api, 'fetchPost').mockResolvedValue({ id: 'p1' });
`,
    );

    const warnings = await detectSameFileSpyUsage(tmpDir);

    expect(warnings).toHaveLength(2);
    expect(warnings.map((w) => w.spiedFunction).sort()).toEqual([
      'fetchPost',
      'fetchUser',
    ]);
  });

  it('reports the spy file path in testFile', async () => {
    await write(
      'http.ts',
      `
export const doThing = () => 'x';
export const caller = () => doThing();
`,
    );

    await write(
      'spy.ts',
      `
import * as http from './http';

export const mock = () =>
  jest.spyOn(http, 'doThing').mockReturnValue('mocked');
`,
    );

    const warnings = await detectSameFileSpyUsage(tmpDir);

    expect(warnings).toHaveLength(1);
    expect(warnings[0]?.testFile).toBe(path.join(tmpDir, 'spy.ts'));
  });

  it('does not produce duplicate warnings for a chained call on spyOn', async () => {
    await write(
      'http.ts',
      `
export const doThing = () => 'x';
export const caller = () => doThing();
`,
    );

    // The .mockReturnValue(...) call_expression has only one argument and must
    // NOT be mistakenly identified as a second spyOn call.
    await write(
      'spy.ts',
      `
import * as http from './http';

export const mock = () =>
  jest.spyOn(http, 'doThing').mockReturnValue('mocked');
`,
    );

    const warnings = await detectSameFileSpyUsage(tmpDir);

    expect(warnings).toHaveLength(1);
  });

  it('warns when a function is both spied on and directly imported in the test file', async () => {
    await write(
      'service.ts',
      `
export const doThing = () => 'original';
export const otherThing = () => 'other';
`,
    );

    // Direct import + namespace spy — the direct import bypasses the spy.
    await write(
      'test.ts',
      `
import * as service from './service';
import { doThing } from './service';

jest.spyOn(service, 'doThing').mockReturnValue('mocked');

// This calls the original, not the mock!
doThing();
`,
    );

    const warnings = await detectSameFileSpyUsage(tmpDir);

    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toMatchObject({
      importSpecifier: './service',
      spiedFunction: 'doThing',
      resolvedFile: path.join(tmpDir, 'service.ts'),
      reason: 'direct-import-in-test',
    });
  });

  it('does not warn for direct import if the spied function is different', async () => {
    await write(
      'service.ts',
      `
export const doThing = () => 'original';
export const otherThing = () => 'other';
`,
    );

    await write(
      'test.ts',
      `
import * as service from './service';
import { otherThing } from './service';

jest.spyOn(service, 'doThing').mockReturnValue('mocked');

otherThing();
`,
    );

    const warnings = await detectSameFileSpyUsage(tmpDir);

    expect(warnings).toEqual([]);
  });

  it('warns when a function is directly imported and spied on, even if not used internally', async () => {
    await write(
      'service.ts',
      `
export const doThing = () => 'original';
`,
    );

    // Function is NOT used internally in service.ts, but IS directly imported
    // in the test file alongside the spy — this still causes the spy to be bypassed.
    await write(
      'test.ts',
      `
import * as service from './service';
import { doThing } from './service';

jest.spyOn(service, 'doThing').mockReturnValue('mocked');

doThing(); // bypasses spy
`,
    );

    const warnings = await detectSameFileSpyUsage(tmpDir);

    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toMatchObject({
      reason: 'direct-import-in-test',
    });
  });
});
