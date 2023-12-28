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
    "/id~union0": "Expected string, received null",
    "/id~union1": "Expected number, received null",
    "/summary~union1": "Required",
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
    "/description~union0~union0": "Required",
    "/description~union0~union1": "Required",
    "/id~union0": "Required",
    "/id~union1": "Required",
    "/summary~union1": "Required",
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
    "/description~union0/content~union1": "Required",
    "/description~union0~union0": "Expected string, received object",
    "/id~union0": "Expected string, received null",
    "/id~union1": "Expected number, received null",
    "/summary~union1": "Required",
  },
  "message": "Input validation failed",
}
`),
      );
  });
});
