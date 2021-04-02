import { withPackage } from '../processing/package.js';
import { Module, Options } from '../types.js';

export const node14Module = ({ type }: Options): Module =>
  type === 'package'
    ? // TODO: be less aggressive with packages.
      {}
    : {
        '**/.nvmrc': (inputFile) => {
          if (!inputFile) {
            return;
          }

          return inputFile.replace(/\d^{1,2}/, '14');
        },

        '**/tsconfig*.json': (inputFile) => {
          if (!inputFile) {
            return;
          }

          // TODO: detect `target` key?
          return inputFile.replace('es2019', 'es2020');
        },

        '**/serverless*.yml': (inputFile) => {
          if (!inputFile) {
            return;
          }

          // TODO: detect `runtime` key?
          // TODO: detect Lambda@Edge?
          return inputFile.replace(/nodejs\d{1,2}\.x/gi, 'nodejs14.x');
        },

        '**/*Dockerfile*': (inputFile) => {
          if (!inputFile) {
            return;
          }

          return inputFile
            .replace(/node:\d{1,2}-alpine/gi, 'node:14-alpine')
            .replace(
              /gcr\.io\/distroless\/nodejs:\d{1,2}/gi,
              'gcr.io/distroless/nodejs:14',
            );
        },

        '**/package.json': withPackage(({ engines, ...data }) => ({
          ...data,
          engines: {
            ...engines,
            node: '>=14',
          },
        })),
      };
