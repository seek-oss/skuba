import { deleteFiles } from '../processing/deleteFiles';
import { Module } from '../types';

export const nodemonModule = async (): Promise<Module> =>
  Promise.resolve(deleteFiles('nodemon.json'));
