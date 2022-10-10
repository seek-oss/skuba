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
      .expect(({ text }) =>
        expect(text).toMatchInlineSnapshot(
          `"{"message":"Input validation failed","invalidFields":{"/id":"Expected string, received null"}}"`,
        ),
      );
  });

  it('blocks missing props', () =>
    agent
      .post('/')
      .send({})
      .expect(422)
      .expect(({ text }) =>
        expect(text).toMatchInlineSnapshot(
          `"{"message":"Input validation failed","invalidFields":{"/id":"Required","/description":"Required"}}"`,
        ),
      ));
});
