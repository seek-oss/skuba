import { randomIntBetween } from './port.js';

describe('randomIntBetween', () => {
  it('generates integers between min and max inclusive', () => {
    const min = 1000;
    const max = 2000;

    for (let i = 0; i < 1000; i++) {
      const output = randomIntBetween(min, max);

      expect(output).toBeGreaterThanOrEqual(min);
      expect(output).toBeLessThanOrEqual(max);
      expect(Number.isSafeInteger(output)).toBe(true);
    }
  });
});
