import { Request } from 'express';

const tags = (req: Request) => {
  const tags: { [key: string]: string } = {};
  if (typeof req.query.tag === 'string' && req.query.tag.length) {
    const [tagKey, tagValue] = req.query.tag.split('=');
    tags[tagKey] = tagValue;
  }
  return { tags };
};

const sessionRedirect = (req: Request) => {
  const { redirectUrl } = req.query;
  return { redirectUrl };
};

export default { tags, sessionRedirect };
