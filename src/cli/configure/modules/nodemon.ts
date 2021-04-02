import { deleteFiles } from '../processing/deleteFiles.js';
import { Module } from '../types.js';

export const nodemonModule = (): Module => deleteFiles('nodemon.json');
