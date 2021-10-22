import { createBatches } from './batch';

it('should separate a list into batches of 2', () => {
  const list = ['a', 'b', 'c', 'd'];

  const batchedList = createBatches(list, 2);

  expect(batchedList).toStrictEqual([
    ['a', 'b'],
    ['c', 'd'],
  ]);
});

it('should separate a list into batches of 3', () => {
  const list = ['a', 'b', 'c', 'd'];

  const batchedList = createBatches(list, 3);

  expect(batchedList).toStrictEqual([['a', 'b', 'c'], ['d']]);
});

it('should throw an error when no number is given', () => {
  const list = ['a', 'b', 'c', 'd'];

  expect(() =>
    createBatches(list, undefined as unknown as number),
  ).toThrowError();
});
