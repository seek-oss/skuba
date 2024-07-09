import bodyParser from 'koa-bodyparser';

export const jsonBodyParser = bodyParser({ enableTypes: ['json'] });
