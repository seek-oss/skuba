import { extend } from '.';

describe('extend', () => {
  it('handles no props', () => {
    const config = extend();

    expect(config).toHaveProperty('testEnvironment', 'node');
    expect(config.collectCoverageFrom).not.toContain('abc');
    expect(config.setupFiles).toBeUndefined();
  });

  it('adds non-colliding props', () => {
    const config = extend({ setupFiles: ['abc'] });

    expect(config).toHaveProperty('testEnvironment', 'node');
    expect(config.collectCoverageFrom).not.toContain('abc');
    expect(config.setupFiles).toEqual(['abc']);
  });

  it('merges colliding props', () => {
    const config = extend({ collectCoverageFrom: ['abc'] });

    expect(config).toHaveProperty('testEnvironment', 'node');
    expect(config.collectCoverageFrom).toContain('abc');
    expect(config.setupFiles).toEqual(['abc']);
  });
});
