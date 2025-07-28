import { inspect } from 'util';
import { Worker, parentPort, workerData } from 'worker_threads';

import { log } from './logging.js';

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
      .on('exit', (code) =>
        messageReceived
          ? resolve(output)
          : reject(
              new Error(
                code
                  ? `Worker thread failed with exit code ${code}`
                  : 'Worker thread exited without posting a message',
              ),
            ),
      )
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
export const postWorkerOutput = <Input, Output>(
  fn: (input: Input) => Promise<Output>,
  logger = log,
) => {
  const port = parentPort;

  if (!port) {
    logger.err('`postWorkerOutput` called outside of a worker thread context');

    process.exit(1);
  }

  fn(workerData as Input)
    .then((output) => port.postMessage(output))
    .catch((err) => {
      logger.err(inspect(err));

      process.exit(1);
    });
};
