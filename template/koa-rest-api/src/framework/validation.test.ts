import { agentFromMiddleware } from 'src/testing/server';
import {
  IdDescriptionSchema,
  chance,
  mockIdDescription,
} from 'src/testing/types';

import { jsonBodyParser } from './bodyParser';
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
    "~union0/id": "Expected string, received null",
    "~union1/id": "Expected number, received null",
    "~union1/summary": "Required",
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
    "~union0/description~union0": "Required",
    "~union0/description~union1": "Required",
    "~union0/id": "Required",
    "~union1/id": "Required",
    "~union1/summary": "Required",
  },
  "message": "Input validation failed",
}
`),
      ));

  it('blocks invalid nested union prop', () => {
    const idDescription = {
      ...mockIdDescription(),
      description: {
        fontSize: chance.integer(),
      },
    };

    return agent
      .post('/')
      .send({ ...idDescription, id: null })
      .expect(422)
      .expect(({ body }) =>
        expect(body).toMatchInlineSnapshot(`
{
  "invalidFields": {
    "~union0/description~union0": "Expected string, received object",
    "~union0/description~union1/content": "Required",
    "~union0/id": "Expected string, received null",
    "~union1/id": "Expected number, received null",
    "~union1/summary": "Required",
  },
  "message": "Input validation failed",
}
`),
      );
  });
});
