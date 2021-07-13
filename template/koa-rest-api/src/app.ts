import './register';

import { router } from './api';
import { createApp } from './framework/server';

const app = createApp(router.allowedMethods(), router.routes());

export default app;
