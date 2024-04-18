import { internalLint } from './internal';

describe('internalLint', () => {
  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {
      /* no-op */
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('passes on skuba itself', () =>
    expect(internalLint('lint')).resolves.toEqual({
      ok: true,
      fixable: false,
      annotations: [],
    }));
});
