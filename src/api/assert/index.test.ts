import { notNullish } from '.';

describe('notNullish', () => {
  it.each([
    ['empty array', []],
    ['empty object literal', {}],
    ['empty string', ''],
    ['null object', Object.create(null)],
    ['zero', 0],
  ])('allows %s', (_, value) => expect(notNullish(value)).toBeUndefined());

  it.each([
    ['null', null],
    ['undefined', undefined],
  ])('fails %s', (_, value) => expect(() => notNullish(value)).toThrow());
});
