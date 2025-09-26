import type { Patches } from '../../index.js';

import { tryPatchDockerfileSyntaxDirective } from './patchDockerfileSyntaxDirective.js';
import { rewriteSrcImports } from './rewriteSrcImports.js';

export const patches: Patches = [
  {
    apply: tryPatchDockerfileSyntaxDirective,
    description: 'Remove Dockerfile syntax directives',
  },
  {
    apply: rewriteSrcImports,
    description: "Rewrite all 'src' imports to be '#src'",
  },
];
