import { Request } from 'express';
import moment from 'moment';

interface IEntityBody {
  id: string;
  tags?: { [key: string]: string };
  data?: { [key: string]: string };
  expires?: moment.Moment;
  expiresDuration?: moment.Duration;
}

const entity = (req: Request) => {
  const { id, tags, data, expires, expiresDuration }: IEntityBody = req.body;
  return { id, tags, data, expires, expiresDuration };
};

export default { entity };
