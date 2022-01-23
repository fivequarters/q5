import { join } from 'path';
import create_error from 'http-errors';
import { Request, Response, NextFunction } from 'express';
import { getAWSCredentials } from '../credentials';

const version = require(join(__dirname, '..', '..', '..', '..', '..', 'package.json')).version;

process.env.FUNCTION_API_VERSION = version;

interface IHealthResponse extends Record<string, string> {
  version: string;
}

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
        targets.map(async (target) => {
          try {
            await target.check();
          } catch (e) {
            throw new Error(`${target.name} check failed: ${e.message}.`);
          }
        })
      );
    } catch (e) {
      return next(create_error(500, e));
    }

    const GRAFANA_VERSION = process.env.GRAFANA_VERSION;

    let healthPayload: IHealthResponse = {
      version,
    };

    if (GRAFANA_VERSION) {
      healthPayload.grafana = GRAFANA_VERSION;
    }

    return res.json(healthPayload);
  };
}

module.exports = {
  version,
  getHealth,
};
