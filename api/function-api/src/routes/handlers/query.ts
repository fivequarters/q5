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

const paginated = (req: Request) => {
  const { limit, next } = req.query;
  return { listLimit: Number(limit), next: next as string | undefined };
};

const prefix = (req: Request) => {
  const { idPrefix } = req.query;
  return { idPrefix: idPrefix as string | undefined };
};

const decodeSessionStep = (req: Request) => {
  const { state } = req.query;
  return { sessionId: Buffer.from(state as string, 'base64').toString() };
};

const encodeSessionStep = (sessionId: string) => {
  const state = Buffer.from(
    JSON.stringify({
      sessionId,
    })
  ).toString('base64');
  return { state };
};

export default { tags, sessionRedirect, paginated, prefix, decodeSessionStep, encodeSessionStep };
