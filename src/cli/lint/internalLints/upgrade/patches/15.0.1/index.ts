import type { Patches } from "../../index.js";

import { tryRemovePnpmPlugin } from "./removePnpmPlugin.js";

export const patches: Patches = [
  {
    apply: tryRemovePnpmPlugin,
    description: "Remove pnpm-plugin-skuba",
  },
];
