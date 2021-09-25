import { Worker, parentPort, workerData } from 'worker_threads';

/**
 * Executes a script at `filepath` in a Node.js worker thread.
 */
export const execWorkerThread = async <Input, Output>(
  filepath: string,
  input: Input,
) => {
  let output: Output;
  let messageReceived = false;

  return new Promise<Output>((resolve, reject) =>
    new Worker(filepath, {
      workerData: input,
    })
      .on('error', reject)
      .on('exit', (code) => {
        if (messageReceived) {
          return resolve(output);
        }

        return reject(
          new Error(
            code
              ? `Worker exited with code: ${code}`
              : 'Worker exited without posting a message',
          ),
        );
      })
      .on('message', (message: Output) => {
        // Defer promise resolution to `exit` so stdio can settle.
        output = message;
        messageReceived = true;
      })
      .on('messageerror', (err) => reject(err)),
  );
};

/**
 * Runs a function in a Node.js worker thread context, forwarding the result
 * to the parent thread.
 */
export const postWorkerOutput = async <Input, Output>(
  fn: (input: Input) => Promise<Output>,
) => {
  if (!parentPort) {
    throw new Error('startWorkerThread called outside of a worker context');
  }

  const output = await fn(workerData);

  parentPort.postMessage(output);
};
