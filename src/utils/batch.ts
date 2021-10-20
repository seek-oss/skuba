const createBatches = <T extends unknown>(
  list: T[],
  batchSize: number,
): T[][] => {
  if (!Number.isInteger(batchSize) || batchSize < 0) {
    throw new Error('Invalid batchSize provided');
  }

  const batchList: T[][] = [];
  for (let i = 0; i < Math.ceil(list.length / batchSize); i++) {
    const startIndex = i * batchSize;
    batchList.push(list.slice(startIndex, startIndex + batchSize));
  }
  return batchList;
};

export { createBatches };
