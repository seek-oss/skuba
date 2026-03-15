import json from '@ast-grep/lang-json';
import yaml from '@ast-grep/lang-yaml';
import { registerDynamicLanguage } from '@ast-grep/napi';

let registered = false;

/**
 * Register all ast-grep dynamic languages used across internalLints.
 *
 * `@ast-grep/napi`'s native `.node` addon is a process-level singleton — it is
 * never unloaded even when Jest resets the JS module cache between test files.
 *
 * This means we need to register them all together
 */
export const registerAstGrepLanguages = () => {
  if (registered) {
    return;
  }
  registerDynamicLanguage({ json, yaml });
  registered = true;
};
