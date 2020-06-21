import 'skuba-dive/register';

import { router } from 'src/api';
import { config } from 'src/config';
import { createApp } from 'src/framework/server';

export const app = createApp(router.allowedMethods(), router.routes());

module.exports = Object.assign(app, { app, port: config.port });
