import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["cjs", "esm"],
  outDir: "lib",
  dts: true,
  checks: {
    legacyCjs: false,
  },
  publint: true,
  attw: true,
  exports: { devExports: "@seek/skuba/source" },
});
