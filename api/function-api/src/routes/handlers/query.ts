import { Request } from 'express';

const tags = (req: Request) => {
  const results: { [key: string]: string } = {};
  if (typeof req.query.tag === 'string' && req.query.tag.length) {
    const [tagKey, tagValue] = req.query.tag.split('=');
    results[tagKey] = tagValue;
  }
  return { tags: results };
};

export default { tags };
