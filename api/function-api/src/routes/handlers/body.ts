import ms from 'ms';
import { Request } from 'express';

interface IEntityBody {
  id: string;
  tags?: { [key: string]: string };
  data?: { [key: string]: string };
  expires?: string;
}

const entity = (req: Request) => {
  const { id, tags, data, expires }: IEntityBody = req.body;

  return { id, tags, data, expires };
};

export default { entity };
