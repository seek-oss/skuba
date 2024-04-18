import { fastify } from 'fastify';

const createApp = async () => {
  const app = fastify();
  app.get('/fastify', (_req, reply) => reply.code(200).send('Fastify!'));
  await app.ready();
  return app;
};

const app = createApp();

export default app;
