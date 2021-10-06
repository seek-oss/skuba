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
    expect(config.setupFiles).toEqual(['abc']);
  });

  it('overrides colliding non-array props', () => {
    const config = mergePreset({ testEnvironment: 'jsdom' });

    expect(config).toHaveProperty('testEnvironment', 'jsdom');
  });
});
