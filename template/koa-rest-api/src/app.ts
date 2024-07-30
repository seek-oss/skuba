import './register';

import { router } from './api.js';
import { createApp } from './framework/server.js';

const app = createApp(router.allowedMethods(), router.routes());

export default app;
