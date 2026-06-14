import { createRequire } from 'node:module';

import type {
  BundlingOptions,
  ICommandHooks,
  NodejsFunction as NodejsFunctionClass,
  NodejsFunctionProps,
} from './nodejsFunction/index.js';
import { normaliseTemplate } from './normaliseTemplate/index.js';

export type { BundlingOptions, ICommandHooks, NodejsFunctionProps };

const require = createRequire(import.meta.url);

let cached: typeof NodejsFunctionClass | undefined;

export const Cdk = {
  normaliseTemplate,

  /**
   * Lazily loads {@link NodejsFunction} on first access so that the optional
   * `aws-cdk-lib`, `constructs` and `rolldown` peer dependencies are only
   * required by consumers that actually use the construct.
   */
  // eslint-disable-next-line no-restricted-syntax -- intentional synchronous lazy getter so the optional aws-cdk-lib/constructs/rolldown peers load only on access
  get NodejsFunction(): typeof NodejsFunctionClass {
    return (cached ??= (
      require('@skuba-lib/api/cdk/nodejsFunction') as {
        NodejsFunction: typeof NodejsFunctionClass;
      }
    ).NodejsFunction);
  },
};
