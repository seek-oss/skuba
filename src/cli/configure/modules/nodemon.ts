import { deleteFiles } from '../processing/deleteFiles';
import type { Module } from '../types';

export const nodemonModule = (): Module => deleteFiles('nodemon.json');
