import { mergePreset } from '.';

describe('mergePreset', () => {
  it('handles no props', () => {
    const config = mergePreset({});

    expect(config).toHaveProperty('testEnvironment', 'node');
    expect(config.collectCoverageFrom).not.toContain('abc');
    expect(config.setupFiles).toBeUndefined();
  });

  it('adds non-colliding props', () => {
    const config = mergePreset({ setupFiles: ['abc'] });

    expect(config).toHaveProperty('testEnvironment', 'node');
    expect(config.collectCoverageFrom).not.toContain('abc');
    expect(config.setupFiles).toEqual(['abc']);
  });

  it('merges colliding array props', () => {
    const config = mergePreset({ collectCoverageFrom: ['abc'] });

    expect(config).toHaveProperty('testEnvironment', 'node');
    expect(config.collectCoverageFrom).toContain('abc');
    expect(config.setupFiles).toBeUndefined();
  });

  it('overrides colliding non-array props', () => {
    const config = mergePreset({ testEnvironment: 'jsdom' });

    expect(config).toHaveProperty('testEnvironment', 'jsdom');
  });

  it('provides the jest preset transform and moduleNameMapper to projects', () => {
    const config = mergePreset({
      projects: [{ displayName: 'unit' }, { displayName: 'integration' }],
    });

    expect(config.projects).toStrictEqual([
      {
        displayName: 'unit',
        transform: expect.any(Object),
        moduleNameMapper: expect.any(Object),
      },
      {
        displayName: 'integration',
        transform: expect.any(Object),
        moduleNameMapper: expect.any(Object),
      },
    ]);
  });

  it('allows paths to be passed to projects', () => {
    const config = mergePreset({
      projects: ['src/project1', 'src/project2'],
    });

    expect(config.projects).toStrictEqual(['src/project1', 'src/project2']);
  });
});
