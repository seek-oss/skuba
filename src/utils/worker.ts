import { Worker, parentPort, workerData } from 'worker_threads';

/**
 * Executes a script at `filepath` in a Node.js worker thread.
 */
export const execWorkerThread = async <Input, Output>(
  filepath: string,
  input: Input,
) =>
  new Promise<Output>((resolve, reject) =>
    new Worker(filepath, {
      workerData: input,
    })
      .on('error', reject)
      .on('exit', (code) =>
        reject(new Error(`Worker exited with code: ${code}`)),
      )
      .on('message', (message: Output) => resolve(message))
      .on('messageerror', (err) => reject(err)),
  );

/**
 * Runs a function in a Node.js worker thread context, forwarding the result
 * to the parent thread.
 */
export const startWorkerThread = async <Input, Output>(
  fn: (input: Input) => Promise<Output>,
) => {
  if (!parentPort) {
    throw new Error('startWorkerThread called outside of a worker context');
  }

  const output = await fn(workerData);

  parentPort.postMessage(output);
};
