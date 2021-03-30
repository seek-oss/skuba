import { agentFromMiddleware } from 'src/testing/server';
import {
  chance,
  filterIdDescription,
  mockIdDescription,
} from 'src/testing/types';

import { jsonBodyParser } from './middleware';
import { validate } from './validation';

const agent = agentFromMiddleware(jsonBodyParser, (ctx) => {
  const result = validate({
    ctx,
    input: ctx.request.body,
    filter: filterIdDescription,
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
      .expect(422, 'Expected string, but was null in id');
  });

  it('blocks missing props', () =>
    agent
      .post('/')
      .send({})
      .expect(
        422,
        'Expected "id" property to be present, but was missing in id',
      ));
});
