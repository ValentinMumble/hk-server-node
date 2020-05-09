import {ServerError} from './server-error';

type APIResponse<T> = {
  uri: string;
  status: number;
  errors: ServerError[];
  results: T[];
};

export type {APIResponse};
