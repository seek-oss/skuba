import path from "path";
import { inspect } from "util";

import { type Edit, type SgNode, parseAsync } from "@ast-grep/napi";
import { glob } from "fast-glob";
import fs from "fs-extra";

import { createExec, exec } from "../../../../../../utils/exec.js";
import { log } from "../../../../../../utils/logging.js";
import { detectPackageManager } from "../../../../../../utils/packageManager.js";
import { isLikelyPackage } from "../../../../../migrate/nodeVersion/checks.js";
import { tryRefreshConfigFiles } from "../../../refreshConfigFiles.js";
import { registerAstGrepLanguages } from "../../../registerAstGrepLanguages.js";
import type { PatchFunction, PatchReturnType } from "../../index.js";

import { getOwnerAndRepo } from "@skuba-lib/api/git";

const replaceAssetsField = (ast: SgNode): { edits: Edit[]; assetsData: string[] | null } => {
  const skubaObject = ast.find({
    rule: {
      kind: "object",
      inside: {
        kind: "pair",
        has: {
          field: "key",
          regex: '^"skuba"$',
        },
      },
    },
  });

  const assetsPair = skubaObject?.find({
    rule: {
      kind: "pair",
      has: {
        field: "key",
        regex: '^"assets"$',
      },
    },
  });

  if (!assetsPair) {
    return { edits: [], assetsData: null };
  }

  const assetsArray = assetsPair.find({
    rule: {
      kind: "array",
    },
  });

  if (!assetsArray) {
    throw new Error("assets array not found in package.json");
  }

  const assetsData = JSON.parse(assetsArray.text()) as unknown;

  if (!Array.isArray(assetsData)) {
    throw new Error("skuba.assets must be an array");
  }

  if (!assetsData.every((item) => typeof item === "string")) {
    throw new Error("skuba.assets must be an array of strings");
  }

  const edits = [assetsPair.replace("")];

  // Remove the trailing comma of the assets pair or the preceding comma if it exists to avoid leaving a dangling comma
  const maybeCommaAfter = assetsPair?.next();
  if (maybeCommaAfter?.text().trim() === ",") {
    edits.push(maybeCommaAfter.replace(""));
  } else {
    const maybeCommaBefore = assetsPair?.prev();
    if (maybeCommaBefore?.text().trim() === ",") {
      edits.push(maybeCommaBefore.replace(""));
    }
  }

  return { edits, assetsData };
};

const editFilesField = (ast: SgNode): Edit[] => {
  const filesPair = ast.find({
    rule: {
      kind: "pair",
      has: {
        field: "key",
        regex: '^"files"$',
      },
    },
  });

  if (!filesPair) {
    return [];
  }
  const filesArray = filesPair.find({
    rule: {
      kind: "array",
    },
  });

  if (!filesArray) {
    throw new Error("files array not found in package.json");
  }

  const existingFiles = JSON.parse(filesArray.text()) as unknown;

  if (!Array.isArray(existingFiles)) {
    throw new Error("files field must be an array");
  }

  const newFiles = existingFiles.filter(
    (file: string) =>
      !(file.startsWith("lib*") || file.startsWith("lib/") || file.startsWith("lib-")),
  );

  newFiles.push("lib");

  const edits = [filesArray.replace(JSON.stringify(newFiles))];

  return edits;
};

const addEngine = (ast: SgNode): Edit[] => {
  const enginesPair = ast.find({
    rule: {
      kind: "pair",
      has: {
        field: "key",
        regex: '^"engines"$',
      },
    },
  });

  if (enginesPair) {
    const nodeEnginePair = enginesPair.find({
      rule: {
        kind: "pair",
        has: {
          field: "key",
          regex: '^"node"$',
        },
      },
    });

    if (nodeEnginePair) {
      return [];
    }

    const enginesObject = enginesPair.find({
      rule: { pattern: "{" },
    });

    if (!enginesObject) {
      throw new Error("invalid engines field in package.json");
    }

    const edit = enginesObject.replace(`{
    "node": ">=22.14.0",`);

    return [edit];
  }

  const startingBracket = ast.find({ rule: { pattern: "{" } });
  if (!startingBracket) {
    throw new Error("invalid package.json");
  }

  const edit = startingBracket.replace(
    `{
  "engines": {
    "node": ">=22.14.0"
  },`,
  );

  return [edit];
};

const removePublishConfig = (ast: SgNode): Edit[] => {
  const publishConfigPair = ast.find({
    rule: {
      kind: "pair",
      has: {
        field: "key",
        regex: '^"publishConfig"$',
      },
    },
  });

  if (!publishConfigPair) {
    return [];
  }

  const edits = [publishConfigPair.replace("")];

  // Remove the trailing comma of the publishConfig pair or the preceding comma if it exists to avoid leaving a dangling comma
  const maybeCommaAfter = publishConfigPair?.next();
  if (maybeCommaAfter?.text().trim() === ",") {
    edits.push(maybeCommaAfter.replace(""));
  } else {
    const maybeCommaBefore = publishConfigPair?.prev();
    if (maybeCommaBefore?.text().trim() === ",") {
      edits.push(maybeCommaBefore.replace(""));
    }
  }

  return edits;
};

const addSkipLibCheckToTsConfig = (ast: SgNode): Edit[] => {
  const compilerOptionsObj = ast.find({
    rule: {
      pattern: {
        context: '{"compilerOptions":}',
        selector: "pair",
      },
    },
  });

  if (!compilerOptionsObj) {
    const startingBracket = ast.find({ rule: { pattern: "{" } });
    if (!startingBracket) {
      return [];
    }

    const edit = startingBracket.replace(
      `{
  "compilerOptions": {
    "skipLibCheck": true // tsdown has optional peer deps
  },`,
    );
    return [edit];
  }

  const skipLibCheckOption = compilerOptionsObj.find({
    rule: { pattern: '"skipLibCheck"' },
  });

  if (skipLibCheckOption) {
    return [];
  }

  const compilerOptionsStart = compilerOptionsObj.find({
    rule: { pattern: "{" },
  });

  if (!compilerOptionsStart) {
    return [];
  }

  const edit = compilerOptionsStart.replace(`{
    "skipLibCheck": true, // tsdown has optional peer deps`);
  return [edit];
};

const findCustomCondition = (ast: SgNode): string | undefined => {
  const customConditionPair = ast.find({
    rule: {
      kind: "pair",
      has: {
        field: "key",
        regex: '^"customConditions"$',
      },
    },
  });

  if (!customConditionPair) {
    return undefined;
  }

  const customConditionsArray = customConditionPair.find({
    rule: {
      kind: "array",
    },
  });

  if (!customConditionsArray) {
    return undefined;
  }

  const firstCustomCondition = customConditionsArray.find({
    rule: {
      kind: "string",
    },
  });

  if (!firstCustomCondition) {
    return undefined;
  }

  return firstCustomCondition.text().slice(1, -1);
};

const findOrAddCustomConditionInRepo = async (mode: "lint" | "format"): Promise<string> => {
  try {
    const rootTsConfigPath = path.join(process.cwd(), "tsconfig.json");
    const tsConfigContent = await fs.promises.readFile(rootTsConfigPath, "utf8");
    const tsConfigAst = (await parseAsync("json", tsConfigContent)).root();
    const condition = findCustomCondition(tsConfigAst);

    if (!condition) {
      const { edits, customCondition } = await addCustomConditionsToTsConfig(tsConfigAst);
      const updatedTsConfigContent = tsConfigAst.commitEdits(edits);

      if (mode === "lint") {
        return customCondition;
      }
      await fs.promises.writeFile(rootTsConfigPath, updatedTsConfigContent, "utf8");
      return customCondition;
    }

    return condition;
  } catch {
    log.warn(
      "unable to find or read root tsconfig.json, skipping adding custom condition to exports",
    );
    return "";
  }
};

const addCustomConditionsToTsConfig = async (
  ast: SgNode,
): Promise<{ edits: Edit[]; customCondition: string }> => {
  const ownerAndRepo = await getOwnerAndRepo({
    dir: process.cwd(),
  });

  const customCondition = `@seek/${ownerAndRepo.repo}/source`;

  const compilerOptionsObj = ast.find({
    rule: {
      pattern: {
        context: '{"compilerOptions":}',
        selector: "pair",
      },
    },
  });

  if (!compilerOptionsObj) {
    const startingBracket = ast.find({ rule: { pattern: "{" } });
    if (!startingBracket) {
      throw new Error("invalid tsconfig.json");
    }

    const edit = startingBracket.replace(
      `{
  "compilerOptions": {
    "customConditions": ["${customCondition}"]
  },`,
    );
    return {
      edits: [edit],
      customCondition,
    };
  }

  const compilerOptionsStart = compilerOptionsObj.find({
    rule: { pattern: "{" },
  });

  if (!compilerOptionsStart) {
    throw new Error("invalid tsconfig.json");
  }

  const edit = compilerOptionsStart.replace(`{
     "customConditions": ["@seek/${ownerAndRepo.repo}/source"],`);

  return {
    edits: [edit],
    customCondition,
  };
};

const projectContainsReferences = async (): Promise<boolean> => {
  const allTsconfigBuildPaths = await glob(["**/tsconfig.build.json"], {
    cwd: process.cwd(),
    ignore: ["**/node_modules/**", "**/.git/**"],
  });

  const allTsconfigBuildFiles = await Promise.all(
    allTsconfigBuildPaths.map(async (tsconfigBuildPath) => {
      const fullPath = path.join(process.cwd(), tsconfigBuildPath);
      return fs.promises.readFile(fullPath, "utf8");
    }),
  );

  if (allTsconfigBuildFiles.some((content) => content.includes("references"))) {
    log.subtle(
      "Found tsconfig.build.json with project references, skipping removal of tsconfig.build.json",
    );
    return true;
  }

  return false;
};

export const patchPackageBuilds: PatchFunction = async ({ mode }): Promise<PatchReturnType> => {
  let packageJsonPaths: string[];
  try {
    packageJsonPaths = await glob(["**/package.json"], {
      ignore: ["**/.git", "**/node_modules"],
    });
  } catch {
    return {
      result: "skip",
      reason: "unable to find package.json files",
    };
  }

  if (packageJsonPaths.length === 0) {
    return {
      result: "skip",
      reason: "unable to find package.json files",
    };
  }

  const likelyPackagePaths = (
    await Promise.all(
      packageJsonPaths.map(async (packageJsonPath) =>
        (await isLikelyPackage(packageJsonPath, false)) ? packageJsonPath : null,
      ),
    )
  ).filter((packageJsonPath) => packageJsonPath !== null);

  if (likelyPackagePaths.length === 0) {
    return {
      result: "skip",
      reason: "no skuba build-package command found",
    };
  }

  registerAstGrepLanguages();

  const [customCondition, containsReferences] = await Promise.all([
    findOrAddCustomConditionInRepo(mode),
    projectContainsReferences(),
  ]);

  const updatedFiles = await Promise.all(
    likelyPackagePaths.map(async (packageJsonPath) => {
      const updated: Array<{
        file: string;
        contents: string;
      }> = [];

      const directory = path.dirname(packageJsonPath);

      const files = await fs.promises.readdir(directory);

      const existingTsdownConfig = files.find((file) => file.startsWith("tsdown.config"));
      if (existingTsdownConfig) {
        return null;
      }

      let packageJsonContent: string;
      try {
        packageJsonContent = await fs.promises.readFile(packageJsonPath, "utf8");
      } catch {
        throw new Error(`unable to read package.json at ${packageJsonPath}`);
      }

      // If a tsconfig.json exists, add skipLibCheck: true to avoid type errors from tsdown's optional peer dependencies.
      // If it doesn't exist, do nothing and let the fix be added manually if it's required
      let tsConfigContent: string;

      const tsConfigPath = path.join(directory, "tsconfig.json");
      try {
        tsConfigContent = await fs.promises.readFile(tsConfigPath, "utf8");

        const tsConfigAst = (await parseAsync("json", tsConfigContent)).root();

        const tsConfigEdits = addSkipLibCheckToTsConfig(tsConfigAst);
        const updatedTsConfigJsonContent = tsConfigAst.commitEdits(tsConfigEdits);

        updated.push({
          file: tsConfigPath,
          contents: updatedTsConfigJsonContent,
        });
      } catch {
        log.subtle(
          `unable to find or read tsconfig.json at ${tsConfigPath}, skipping tsconfig updates for ${packageJsonPath}`,
        );
      }

      const packageJsonAst = (await parseAsync("json", packageJsonContent)).root();

      const { edits, assetsData } = replaceAssetsField(packageJsonAst);

      const enginesEdits = addEngine(packageJsonAst);

      const filesEdits = editFilesField(packageJsonAst);

      const publishConfigEdits = removePublishConfig(packageJsonAst);

      const updatedPackageJsonContent = packageJsonAst.commitEdits([
        ...edits,
        ...enginesEdits,
        ...filesEdits,
        ...publishConfigEdits,
      ]);

      const tsdownConfigPath = path.join(directory, "tsdown.config.mts");
      const defaultTsdownConfig = `import { defineConfig } from 'tsdown';

    export default defineConfig({
      entry: ['src/index.ts'],
      format: ['cjs', 'esm'],
      outDir: 'lib',
      dts: true,
      checks: {
        legacyCjs: false,
      },
      publint: true,
      attw: true,
      unbundle: true, // TODO: determine if your project can be bundled
      ${customCondition ? `exports: { devExports: '${customCondition}' },` : "exports: true,"}${assetsData ? `\n      copy: ${JSON.stringify(assetsData)},` : ""}
    });
    `;

      updated.push({
        file: tsdownConfigPath,
        contents: defaultTsdownConfig,
      });
      updated.push({
        file: packageJsonPath,
        contents: updatedPackageJsonContent,
      });

      if (mode === "lint") {
        return updated;
      }

      const tsConfigBuildPath = path.join(directory, "tsconfig.build.json");

      let tsconfigBuildFileExists = false;

      try {
        await fs.promises.access(tsConfigBuildPath, fs.constants.F_OK);
        tsconfigBuildFileExists = true;
      } catch {}

      await Promise.all([
        ...updated.map(({ file, contents }) => fs.promises.writeFile(file, contents, "utf8")),
        ...(!containsReferences && tsconfigBuildFileExists
          ? [fs.promises.rm(tsConfigBuildPath)]
          : []),
      ]);

      const packageManager = await detectPackageManager();
      await exec(packageManager.command, "install", "--offline");

      const execInPackageDir = createExec({ cwd: directory });
      await execInPackageDir(packageManager.command, "tsdown");

      return updated;
    }),
  );

  const flattenedUpdatedFiles = updatedFiles.flat().filter((file) => file !== null);

  if (flattenedUpdatedFiles.length === 0) {
    return {
      result: "skip",
      reason: "no skuba build-package command found",
    };
  }

  if (mode === "lint") {
    return {
      result: "apply",
    };
  }

  return {
    result: "apply",
  };
};

export const tryPatchPackageBuilds: PatchFunction = async (config) => {
  try {
    await tryRefreshConfigFiles(config.mode, log);
    return await patchPackageBuilds(config);
  } catch (err) {
    log.warn("Failed to patch package builds");
    log.subtle(inspect(err));
    return { result: "skip", reason: "due to package.json error" };
  }
};
