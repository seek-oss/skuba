import type * as z from 'zod/v4';

import { log } from '../../utils/logging.js';

/** Prints a JSON Schema of our expected input format to stdout. */
const printInputSchemaHint = (schema: z.ZodType, detail: string) => {
  log.err(
    log.bold(`${detail}. Expected JSON satisfying the following schema:`),
  );
  log.err(JSON.stringify(schema.toJSONSchema(), null, 2));
};

/**
 * Reads JSON from stdin and validates it against the provided Zod schema.
 *
 * If the input is not provided or invalid, we use the Zod schema to help guide
 * the user towards the correct input format.
 */
export const readJSONFromStdIn = async <T extends z.ZodType>(
  schema: T,
): Promise<z.infer<T>> => {
  // A TTY means nothing has been piped in, so reading would block indefinitely
  // waiting for EOF. Bail out with the expected schema instead of hanging.
  if (process.stdin.isTTY) {
    printInputSchemaHint(schema, 'No data piped to stdin');
    process.exit(1);
  }

  let text = '';

  await new Promise((resolve) =>
    process.stdin
      .on('data', (chunk) => (text += chunk.toString()))
      .once('end', resolve),
  );

  text = text.trim();

  if (text === '') {
    printInputSchemaHint(schema, 'No data from stdin');
    process.exit(1);
  }

  let rawInput: unknown;

  try {
    rawInput = JSON.parse(text) as unknown;
  } catch (err) {
    const detail =
      err instanceof SyntaxError
        ? `Invalid JSON from stdin: ${err.message}`
        : 'Invalid JSON from stdin';

    printInputSchemaHint(schema, detail);
    process.exit(1);
  }

  const parseResult = schema.safeParse(rawInput);
  if (!parseResult.success) {
    log.err(log.bold('Invalid data from stdin:'));
    log.err(parseResult.error);
    process.exit(1);
  }

  return parseResult.data;
};
