import { get_function_tags } from '@5qtrs/function-tags';
import { IFunctionApiRequest } from './Request';

const loadSummary = () => {
  return (req: IFunctionApiRequest, res: Response, next: any) => {
    console.log(`loadSummary ${req.params.accountId}`);
    if (!req.params.accountId) {
      return next();
    }

    return get_function_tags(
      {
        accountId: req.params.accountId,
        subscriptionId: req.params.subscriptionId,
        boundaryId: req.params.boundaryId,
        functionId: req.params.functionId,
      },
      (e: any, d: any) => {
        console.log(`loadSummary result ${e}, ${JSON.stringify(d)}`);
        if (e) {
          return next(e);
        }
        req.functionSummary = d;
        return next();
      }
    );
  };
};

export { loadSummary };
