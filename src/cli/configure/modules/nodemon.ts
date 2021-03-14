import { deleteFiles } from '../processing/deleteFiles';
import { Module } from '../types';

export const nodemonModule = (): Module => deleteFiles('nodemon.json');
