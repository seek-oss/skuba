import { agentFromMiddleware } from 'src/testing/server';
import {
  IdDescriptionSchema,
  chance,
  mockIdDescription,
} from 'src/testing/types';

import { jsonBodyParser } from './middleware';
import { validate } from './validation';

const agent = agentFromMiddleware(jsonBodyParser, (ctx) => {
  const result = validate({
    ctx,
    input: ctx.request.body,
    schema: IdDescriptionSchema,
  });

  ctx.body = result;
});

describe('validate', () => {
  it('permits valid input', () => {
    const idDescription = mockIdDescription();

    return agent.post('/').send(idDescription).expect(200, idDescription);
  });

  it('filters additional properties', () => {
    const idDescription = mockIdDescription();

    return agent
      .post('/')
      .send({ ...idDescription, hacker: chance.name() })
      .expect(200, idDescription);
  });

  it('blocks mistyped prop', () => {
    const idDescription = mockIdDescription();

    return agent
      .post('/')
      .send({ ...idDescription, id: null })
      .expect(422)
      .expect(({ body }) =>
        expect(body).toMatchInlineSnapshot(`
          {
            "invalidFields": {
              "/id": "Expected string, received null",
            },
            "message": "Input validation failed",
          }
        `),
      );
  });

  it('blocks missing props', () =>
    agent
      .post('/')
      .send({})
      .expect(422)
      .expect(({ body }) =>
        expect(body).toMatchInlineSnapshot(`
          {
            "invalidFields": {
              "/description": "Required",
              "/id": "Required",
            },
            "message": "Input validation failed",
          }
        `),
      ));
});
