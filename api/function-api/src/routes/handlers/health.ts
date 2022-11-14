import { join } from 'path';
import create_error from 'http-errors';
import { Request, Response, NextFunction } from 'express';
const { getAWSCredentials } = require('../credentials');
const version = require(join(__dirname, '..', '..', '..', '..', '..', 'package.json')).version;

process.env.FUNCTION_API_VERSION = version;

interface IHealthCheckTarget {
  check: () => Promise<void>;
  name: string;
  once?: boolean;
  satisfied?: boolean;
}

function getHealth(targets: IHealthCheckTarget[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const creds = await getAWSCredentials(false);
    if (!creds) {
      return next(create_error(500, `aws credentials pending`));
    }

    try {
      await Promise.all(
        targets.map(async (target) => {
          try {
            await target.check();
            if (target.once) {
              target.satisfied = true;
            }
          } catch (e) {
            if (target.satisfied) {
              console.log(`HEALTH WARN: ${target.name} check failed: ${e.message}`);
            } else {
              throw new Error(`${target.name} check failed: ${e.message}.`);
            }
          }
        })
      );
    } catch (e) {
      return next(create_error(500, e));
    }

    return res.json({ version });
  };
}

module.exports = {
  version,
  getHealth,
};
