import { deleteFiles } from '../processing/deleteFiles';
import type { Module } from '../types';

export const tslintModule = (): Module =>
  deleteFiles('tslint.json', 'tslint.yaml');
