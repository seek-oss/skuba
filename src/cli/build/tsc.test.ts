import path from 'path';

import { getCustomConditions } from './tsc.js';

describe('getCustomConditions', () => {
  beforeEach(() => {
    const mockCwd = path.join(__dirname, 'test');
    jest.spyOn(process, 'cwd').mockReturnValue(mockCwd);
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it('should return custom conditions from tsconfig.json', () => {
    const conditions = getCustomConditions();
    expect(conditions).toEqual(
      expect.arrayContaining(['condition1', 'condition2']),
    );
  });

  it('should return an empty array when failing to read from tsconfig.json', () => {
    jest
      .spyOn(process, 'cwd')
      .mockReturnValue(path.join(__dirname, 'non-existent'));

    const conditions = getCustomConditions();
    expect(conditions).toEqual(expect.arrayContaining([]));
  });
});
