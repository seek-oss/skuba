import './register.js';

import { router } from './api/index.js';
import { createApp } from './framework/server.js';

const app = createApp(router.allowedMethods(), router.routes());

export default app;
