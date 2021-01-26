import './register';

import { router } from './api';
import { config } from './config';
import { createApp } from './framework/server';

const app = createApp(router.allowedMethods(), router.routes());

Object.assign(app, { port: config.port });

export default app;
