import { deleteFiles } from '../processing/deleteFiles';
import { Module } from '../types';

export const tslintModule = async (): Promise<Module> =>
  Promise.resolve(deleteFiles('tslint.json', 'tslint.yaml'));
