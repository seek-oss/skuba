import { preset } from '.';

describe('preset', () => {
  it('handles static usage', () => {
    const config = preset;

    expect(config).toHaveProperty('testEnvironment', 'node');
    expect(config.collectCoverageFrom).not.toContain('abc');
    expect(config.setupFiles).toBeUndefined();
  });

  it('adds non-colliding props', () => {
    const config = preset({ setupFiles: ['abc'] });

    expect(config).toHaveProperty('testEnvironment', 'node');
    expect(config.collectCoverageFrom).not.toContain('abc');
    expect(config.setupFiles).toEqual(['abc']);
  });

  it('merges colliding props', () => {
    const config = preset({ collectCoverageFrom: ['abc'] });

    expect(config).toHaveProperty('testEnvironment', 'node');
    expect(config.collectCoverageFrom).toContain('abc');
    expect(config.setupFiles).toEqual(['abc']);
  });
});
