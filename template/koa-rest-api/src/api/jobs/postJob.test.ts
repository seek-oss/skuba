import { agentFromRouter } from 'src/testing/server';
import { mockJobInput } from 'src/testing/types';

import { jobRouter } from '.';

const agent = agentFromRouter(jobRouter);

describe('postJobHandler', () => {
  it('200s and allocates an ID on valid input', () => {
    const jobInput = mockJobInput();

    return agent
      .post('/')
      .send(jobInput)
      .expect(200)
      .expect(({ body }) =>
        expect(body).toStrictEqual({ ...jobInput, id: expect.any(String) }),
      );
  });

  it('422s on invalid input', () => {
    const jobInput = {};

    return agent
      .post('/')
      .send(jobInput)
      .expect(422)
      .expect(({ text }) =>
        expect(text).toMatchInlineSnapshot(
          `"{"message":"Input validation failed","invalidFields":{"/hirer":"Required"}}"`,
        ),
      );
  });
});
