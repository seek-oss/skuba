import '@seek/skuba-dive/register';

import { router } from 'src/api';
import { config } from 'src/config';
import { createApp } from 'src/framework/server';

const app = createApp(router.allowedMethods(), router.routes());

export = Object.assign(app, { port: config.port });
