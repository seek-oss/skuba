import { notNullish, nullish, numberProp, object, stringProp } from '.';

describe('nullish', () => {
  it.each([
    ['null', null],
    ['undefined', undefined],
  ])('allows %s', (_, value) => expect(nullish(value)).toBeUndefined());

  it.each([
    ['empty array', []],
    ['empty object literal', {}],
    ['empty string', ''],
    ['null object', Object.create(null)],
    ['zero', 0],
  ])('fails %s', (_, value) => expect(() => nullish(value)).toThrow());
});

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

describe('object', () => {
  it.each([
    ['empty array', []],
    ['empty object literal', {}],
    ['null object', Object.create(null)],
  ])('allows %s', (_, value) => expect(object(value)).toBeUndefined());

  it.each([
    ['empty string', ''],
    ['null', null],
    ['undefined', undefined],
    ['zero', 0],
  ])('fails %s', (_, value) => expect(() => object(value)).toThrow());
});

describe('numberProp', () => {
  it.each([
    ['array index', [123], 0],
    ['object literal with numeric key', { 1: 2 }, 1],
    ['object literal with string key', { '1': 2 }, '1'],
  ])('allows %s', (_, value, prop) =>
    expect(numberProp(value, prop)).toBeUndefined(),
  );

  it.each([
    ['object literal with string value', { 1: '2' }],
    ['empty array', []],
    ['empty object literal', {}],
    ['empty string', ''],
    ['null', null],
    ['null object', Object.create(null)],
    ['undefined', undefined],
    ['zero', 0],
  ])('fails %s', (_, value) => expect(() => numberProp(value, 'a')).toThrow());
});

describe('stringProp', () => {
  it.each([
    ['array index', ['string'], 0],
    ['object literal with numeric key', { 1: '2' }, 1],
    ['object literal with string key', { '1': '2' }, '1'],
  ])('allows %s', (_, value, prop) =>
    expect(stringProp(value, prop)).toBeUndefined(),
  );

  it.each([
    ['object literal with numeric value', { a: 2 }],
    ['empty array', []],
    ['empty object literal', {}],
    ['empty string', ''],
    ['null', null],
    ['null object', Object.create(null)],
    ['undefined', undefined],
    ['zero', 0],
  ])('fails %s', (_, value) => expect(() => stringProp(value, 'a')).toThrow());
});
