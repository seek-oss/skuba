import { Chance } from 'chance';
import * as yup from 'yup';

import { JobInput } from 'src/types/jobs';

export const chance = new Chance();

export const idDescriptionSchema = yup
  .object({
    id: yup.string().required(),
    description: yup.string().required(),
  })
  .required();

export const mockIdDescription = () => ({
  id: chance.guid({ version: 4 }),
  description: chance.sentence(),
});

export const mockJobInput = (): JobInput => ({
  hirer: {
    id: chance.guid({ version: 4 }),
  },
});
