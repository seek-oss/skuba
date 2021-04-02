import { deleteFiles } from '../processing/deleteFiles.js';
import { Module } from '../types.js';

export const tslintModule = (): Module =>
  deleteFiles('tslint.json', 'tslint.yaml');
