import * as yup from 'yup';

export interface Job {
  id: string;

  hirer: {
    id: string;
  };
}

export type JobInput = yup.InferType<typeof jobInputSchema>;

export const jobInputSchema = yup
  .object({
    hirer: yup
      .object({
        id: yup.string().required(),
      })
      .required(),
  })
  .required();
