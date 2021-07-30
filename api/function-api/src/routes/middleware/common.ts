import { default as Cors } from 'cors';
import * as express from 'express';

import * as analytics from './analytics';
import validate_schema from './validate_schema';
import authorize from './authorize';

const corsManagementOptions = {
  origins: '*',
  methods: 'GET,POST,PUT,DELETE,PATCH',
  exposedHeaders: 'x-fx-logs,x-fx-response-source,content-length',
  credentials: true,
};

interface ICommonOptions {
  validate?: object[] | object;
  authorize?: object;
}

type Middleware = (req: express.Request, res: express.Response, next: express.NextFunction) => void | Promise<void>;

const management = (options: ICommonOptions): Middleware[] => {
  const [earlyValidate, lateValidate] = Array.isArray(options.validate)
    ? [options.validate[0], options.validate[1]]
    : [options.validate, undefined];

  return [
    analytics.enterHandler(),
    cors(),
    earlyValidate && validate_schema(earlyValidate),
    options.authorize && authorize(options.authorize),
    express.json(),
    lateValidate && validate_schema(lateValidate),
  ].filter((x) => x) as Middleware[];
};

const cors = () => Cors(corsManagementOptions);

const final = () => {
  return [analytics.finished];
};

export { management, cors, final };
