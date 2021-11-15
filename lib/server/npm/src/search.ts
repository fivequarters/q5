import { Response, Request } from 'express';
import { tarballUrlUpdate } from './package';
import { IFunctionApiRequest } from './request';

/*
 * Proper npm search is super primitive - it does a search and returns only the top 20 items, with no
 * particularly well documented support for any pagination, especially not in the client itself.
 *
 * As a stop-gap to spending ages figuring out exactly how to rig this, loop until either `count` entries have
 * been found or there's no further next parameters available, filling up an entry even when empty pages would
 * normally be returned due to DynamoDB not returning any valid entries.
 */
const searchGet = () => {
  return async (reqBase: Request, res: Response, next: any) => {
    const req = reqBase as IFunctionApiRequest;
    const count = req.query.count ? Number(req.query.count) : 20;
    let searchNext = req.query.next ? (req.query.next as string) : undefined;

    try {
      const objects = [];
      let results;
      do {
        results = await req.registry.search(req.query.text as string, count, searchNext);

        for (const pkg of results.objects) {
          tarballUrlUpdate(req, pkg.package);
        }

        objects.push(...results.objects);

        searchNext = results.next;
      } while (searchNext && objects.length < count);

      results.objects = objects;
      results.total = objects.length;
      return res.status(200).json(results);
    } catch (e) {
      return next(e);
    }
  };
};

export { searchGet };
