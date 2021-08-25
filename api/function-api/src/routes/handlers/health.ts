import { join } from 'path';
import create_error from 'http-errors';
import { Request, Response, NextFunction } from 'express';
const { getAWSCredentials } = require('../credentials');
const version = require(join(__dirname, '..', '..', '..', '..', '..', 'package.json')).version;

process.env.FUNCTION_API_VERSION = version;

interface IHealthCheckTarget {
  check: () => Promise<void>;
  name: string;
}

function getHealth(targets: IHealthCheckTarget[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    let creds = await getAWSCredentials(false);
    if (!creds) {
      return next(create_error(500, `aws credentials pending`));
    }

    try {
      await Promise.all(
        targets.map((target) => {
          try {
            return target.check();
          } catch (e) {
            throw new Error(`${target.name} check failed: ${e.message}.`);
          }
        })
      );
    } catch (e) {
      console.log(e);
      return next(create_error(500, e));
    }

    return res.json({ version });
  };
}

module.exports = {
  version,
  getHealth,
};
