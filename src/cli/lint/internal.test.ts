import { internalLint } from './internal';

describe('internalLint', () => {
  it('passes on skuba itself', () =>
    expect(internalLint()).resolves.toBeUndefined());
});
