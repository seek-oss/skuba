import nodeHttp from 'http';
import path from 'path';

import request from 'supertest';

import * as http from './http';
import { main } from './main';

jest.mock('../utils/logging');

const initWrapper = (entryPoint: string) =>
  main(path.join('src', 'wrapper', 'testing', entryPoint), '8080');

let agent: ReturnType<(typeof request)['agent']>;

const startServer = jest
  .spyOn(http, 'startServer')
  .mockImplementation((server) => {
    agent = request.agent(server);
    return Promise.resolve();
  });

afterEach(startServer.mockClear);

test('asyncFunctionHandler', async () => {
  // Without `.ts`
  await initWrapper('asyncFunctionHandler#handler');

  expect(startServer).toHaveBeenCalledTimes(1);

  return Promise.all([
    agent
      .post('/')
      .send([{ id: 1 }, { awsRequestId: '123' }])
      .expect(200)
      .expect(({ body }) =>
        expect(body).toMatchInlineSnapshot(`
          {
            "awsRequestId": "123",
            "event": {
              "id": 1,
            },
            "msg": "Processed event",
          }
        `),
      ),

    agent
      .post('/')
      .send([null, {}])
      .expect(500)
      .expect(({ body }) =>
        expect(body).toMatchInlineSnapshot(
          { stack: expect.any(String) },
          `
          {
            "message": "falsy event",
            "name": "Error",
            "stack": Any<String>,
          }
        `,
        ),
      ),
  ]);
});

test('expressRequestListener', async () => {
  // With `.ts`
  await initWrapper('expressRequestListener.ts');

  expect(startServer.mock.calls).toEqual([
    [expect.any(nodeHttp.Server), 12345],
  ]);

  return Promise.all([
    agent
      .get('/express')
      .expect(200)
      .expect(({ text }) => expect(text).toMatchInlineSnapshot(`"Express!"`)),

    agent.get('/koa').expect(404),
  ]);
});

test('invalidRequestListener', async () => {
  await expect(initWrapper('invalidRequestListener')).resolves.toBeUndefined();

  expect(startServer).not.toHaveBeenCalled();
});

test('koaRequestListener', async () => {
  // Without `.ts`
  await initWrapper('koaRequestListener');

  expect(startServer.mock.calls).toEqual([[expect.any(nodeHttp.Server), 8080]]);

  return Promise.all([
    agent
      .get('/koa')
      .expect(200)
      .expect(({ text }) => expect(text).toMatchInlineSnapshot(`"Koa!"`)),

    agent.get('/express').expect(404),
  ]);
});

test('httpServerRequestListener', async () => {
  // Without `.ts`
  await initWrapper('httpServerRequestListener');

  expect(startServer.mock.calls).toEqual([[expect.any(nodeHttp.Server), 8080]]);

  return Promise.all([
    agent
      .get('/httpServer')
      .expect(200)
      .expect(({ text }) =>
        expect(text).toMatchInlineSnapshot(`"Http Server!"`),
      ),

    agent.get('/express').expect(404),
  ]);
});

test('fastifyRequestListener', async () => {
  // Without `.ts`
  await initWrapper('fastifyRequestListener');

  return Promise.all([
    agent
      .get('/fastify')
      .expect(200)
      .expect(({ text }) => expect(text).toMatchInlineSnapshot(`"Fastify!"`)),

    agent.get('/express').expect(404),
  ]);
});

test('miscellaneousExportModule', async () => {
  await expect(
    initWrapper('miscellaneousExportModule'),
  ).resolves.toBeUndefined();

  expect(startServer).not.toHaveBeenCalled();
});

test('noExportModule', async () => {
  await expect(initWrapper('noExportModule')).resolves.toBeUndefined();

  expect(startServer).not.toHaveBeenCalled();
});

test('syncFunctionHandler', async () => {
  // With `.ts`
  await initWrapper('syncFunctionHandler.ts#handler');

  expect(startServer).toHaveBeenCalledTimes(1);

  return Promise.all([
    agent
      .post('/')
      .send('"a"')
      .expect(200)
      .expect(({ body }) => expect(body).toMatchInlineSnapshot(`"aaa"`)),

    agent
      .post('/')
      .send('Invalid JSON')
      .expect(500)
      .expect(({ body }) =>
        expect(body).toMatchInlineSnapshot(
          { stack: expect.any(String) },
          `
          {
            "message": "Unexpected token 'I', "Invalid JSON" is not valid JSON",
            "name": "SyntaxError",
            "stack": Any<String>,
          }
        `,
        ),
      ),
  ]);
});

test('voidFunctionHandler', async () => {
  // With `.ts`
  await initWrapper('voidFunctionHandler.ts#handler');

  expect(startServer).toHaveBeenCalledTimes(1);

  return (
    agent
      .post('/')
      // No request body
      .send()
      .expect(200)
      // No response body
      .expect(({ text }) => expect(text).toBe(''))
  );
});
