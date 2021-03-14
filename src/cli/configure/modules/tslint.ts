import { deleteFiles } from '../processing/deleteFiles';
import { Module } from '../types';

export const tslintModule = (): Module =>
  deleteFiles('tslint.json', 'tslint.yaml');
