import { router } from './api/index.js';
import { createApp } from './framework/server.js';

export const app = createApp(router.allowedMethods(), router.routes());
