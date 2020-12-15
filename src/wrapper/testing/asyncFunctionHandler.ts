interface LambdaContext {
  awsRequestId: string;
}

export const handler = async (
  event: unknown,
  { awsRequestId }: LambdaContext,
) => {
  await Promise.resolve();

  if (!event) {
    throw new Error('falsy event');
  }

  return {
    awsRequestId,
    event,
    msg: 'Processed event',
  };
};
