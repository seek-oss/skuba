import path from 'path';

import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { getCustomConditions } from './tsc.js';

describe('getCustomConditions', () => {
  beforeEach(() => {
    const mockCwd = path.join(import.meta.dirname, 'test');
    vi.spyOn(process, 'cwd').mockReturnValue(mockCwd);
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  it('should return custom conditions from tsconfig.json', () => {
    const conditions = getCustomConditions();
    expect(conditions).toEqual(
      expect.arrayContaining(['condition1', 'condition2']),
    );
  });

  it('should return an empty array when failing to read from tsconfig.json', () => {
    vi.spyOn(process, 'cwd').mockReturnValue(
      path.join(import.meta.dirname, 'non-existent'),
    );

    const conditions = getCustomConditions();
    expect(conditions).toEqual(expect.arrayContaining([]));
  });
});
