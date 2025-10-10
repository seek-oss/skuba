import { deleteFiles } from '../processing/deleteFiles.js';
import type { Module } from '../types.js';

export const tslintModule = (): Promise<Module> =>
  Promise.resolve(deleteFiles('tslint.json', 'tslint.yaml'));
