import path from 'path';

import request from 'supertest';

import * as http from './http';
import { main } from './main';

jest.mock('../utils/logging');

const initWrapper = (entryPoint: string) =>
  main(path.join('src', 'wrapper', 'testing', entryPoint), '8080');

let agent: request.SuperAgentTest;

const serveRequestListener = jest
  .spyOn(http, 'serveRequestListener')
  .mockImplementation((requestListener) => {
    agent = request.agent(requestListener);
    return Promise.resolve();
  });

afterEach(serveRequestListener.mockClear);

test('asyncFunctionHandler', async () => {
  // Without `.ts`
  await initWrapper('asyncFunctionHandler#handler');

  expect(serveRequestListener).toBeCalledTimes(1);

  return Promise.all([
    agent
      .post('/')
      .send([{ id: 1 }, { awsRequestId: '123' }])
      .expect(200)
      .expect(({ body }) =>
        expect(body).toMatchInlineSnapshot(`
          Object {
            "awsRequestId": "123",
            "event": Object {
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
          Object {
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

  expect(serveRequestListener.mock.calls).toEqual([
    [expect.any(Function), 12345],
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

  expect(serveRequestListener).not.toBeCalled();
});

test('koaRequestListener', async () => {
  // Without `.ts`
  await initWrapper('koaRequestListener');

  expect(serveRequestListener.mock.calls).toEqual([
    [expect.any(Function), 8080],
  ]);

  return Promise.all([
    agent
      .get('/koa')
      .expect(200)
      .expect(({ text }) => expect(text).toMatchInlineSnapshot(`"Koa!"`)),

    agent.get('/express').expect(404),
  ]);
});

test('miscellaneousExportModule', async () => {
  await expect(
    initWrapper('miscellaneousExportModule'),
  ).resolves.toBeUndefined();

  expect(serveRequestListener).not.toBeCalled();
});

test('noExportModule', async () => {
  await expect(initWrapper('noExportModule')).resolves.toBeUndefined();

  expect(serveRequestListener).not.toBeCalled();
});

test('syncFunctionHandler', async () => {
  // With `.ts`
  await initWrapper('syncFunctionHandler.ts#handler');

  expect(serveRequestListener).toBeCalledTimes(1);

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
          Object {
            "message": "Unexpected token I in JSON at position 0",
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

  expect(serveRequestListener).toBeCalledTimes(1);

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
