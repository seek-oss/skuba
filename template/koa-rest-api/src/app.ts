import 'skuba-dive/register';

import { router } from 'src/api';
import { config } from 'src/config';
import { createApp } from 'src/framework/server';

const koa = createApp(router.allowedMethods(), router.routes());

export const app = (module.exports = Object.assign(koa, { port: config.port }));
