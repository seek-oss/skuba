import { deleteFiles } from '../processing/deleteFiles.js';
import type { Module } from '../types.js';

export const nodemonModule = (): Promise<Module> =>
  Promise.resolve(deleteFiles('nodemon.json'));
