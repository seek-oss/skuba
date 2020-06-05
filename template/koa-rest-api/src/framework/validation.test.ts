import { agentFromMiddleware } from 'src/testing/server';
import {
  chance,
  idDescriptionSchema,
  mockIdDescription,
} from 'src/testing/types';

import { jsonBodyParser } from './middleware';
import { validate } from './validation';

const agent = agentFromMiddleware(jsonBodyParser, async (ctx) => {
  const result = await validate({
    ctx,
    input: ctx.request.body,
    root: 'body',
    schema: idDescriptionSchema,
  });

  ctx.body = result;
});

beforeAll(agent.setup);

afterAll(agent.teardown);

describe('validate', () => {
  it('permits valid input', () => {
    const idDescription = mockIdDescription();

    return agent().post('/').send(idDescription).expect(200, idDescription);
  });

  it('filters additional properties', () => {
    const idDescription = mockIdDescription();

    return agent()
      .post('/')
      .send({ ...idDescription, hacker: chance.name() })
      .expect(200, idDescription);
  });

  it('blocks mistyped prop', () => {
    const idDescription = mockIdDescription();

    return agent()
      .post('/')
      .send({ ...idDescription, id: null })
      .expect(422, {
        errors: [
          {
            path: 'body.id',
            type: 'string',
          },
        ],
      });
  });

  it('blocks missing props', () =>
    agent()
      .post('/')
      .send({})
      .expect(422, {
        errors: [
          {
            path: 'body.id',
            type: 'required',
          },
          {
            path: 'body.description',
            type: 'required',
          },
        ],
      }));
});
