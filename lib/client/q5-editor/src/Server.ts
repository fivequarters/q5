import { ServerResponse } from 'http';
import * as Superagent from 'superagent';
import { Workspace } from './Workspace';
const Superagent1 = Superagent;

class BuildError extends Error {
  constructor(public details: IBuildStatus) {
    super('Build failed.');
  }
}

export interface IAccount {
  baseUrl: string;
  token: string;
}

export type AccountResolver = (account: IAccount | undefined) => Promise<IAccount>;

export interface IBuildStatus {
  status: string;
  boundary: string;
  name: string;
  build_id?: string;
  error?: any;
  progress?: number;
  url?: string;
}

const logsExponentialBackoff = 1.5;
const logsInitialBackoff = 5000;
const logsMaxBackoff = 60000;

export class Server {
  public static create(account: IAccount): Server {
    return new Server(currentAccount => Promise.resolve(account));
  }
  public account: IAccount | undefined;
  public buildTimeout: number = 60000;
  public buildStatusCheckInterval: number = 5000;
  public requestTimeout: number = 15000;
  public sse?: EventSource = undefined;
  public logsBackoff: number = 0;
  public logsTimeout?: number = undefined;

  constructor(public accountResolver: AccountResolver) {}

  public _normalizeAccount(account: IAccount): IAccount {
    if (!account.baseUrl.match(/\/$/)) {
      account.baseUrl += '/';
    }
    return account;
  }

  public getFunctionUrl(workspace: Workspace): string | undefined {
    if (!this.account) {
      return undefined;
    }
    return `${this.account.baseUrl}api/v1/run/${workspace.functionSpecification.boundary}/${
      workspace.functionSpecification.name
    }`;
  }

  public loadWorkspace(boundary: string, name: string, createIfNotExist?: Workspace): Promise<Workspace> {
    return this.accountResolver(this.account)
      .then(newAccount => {
        this.account = this._normalizeAccount(newAccount);
        const url = `${this.account.baseUrl}api/v1/function/${boundary}/${name}`;
        return Superagent.get(url)
          .set('Authorization', `Bearer ${this.account.token}`)
          .timeout(this.requestTimeout);
      })
      .then(res => {
        res.body.boundary = boundary;
        res.body.name = name;
        return new Workspace(res.body);
      })
      .catch(error => {
        if (!createIfNotExist) {
          throw error;
        }
        createIfNotExist.functionSpecification.boundary = boundary;
        createIfNotExist.functionSpecification.name = name;
        return this.buildFunction(createIfNotExist).then(_ => createIfNotExist);
      });
  }

  public buildFunction(workspace: Workspace): Promise<IBuildStatus> {
    let startTime: number;
    let self = this;

    workspace.startBuild();

    return this.accountResolver(this.account)
      .then(newAccount => {
        this.account = this._normalizeAccount(newAccount);
        const url = `${this.account.baseUrl}api/v1/function/${workspace.functionSpecification.boundary}/${
          workspace.functionSpecification.name
        }`;
        startTime = Date.now();
        let params: any = {
          environment: 'nodejs',
          provider: 'lambda',
          configuration: workspace.functionSpecification.configuration,
          lambda: workspace.functionSpecification.lambda,
          nodejs: workspace.functionSpecification.nodejs,
          metadata: workspace.functionSpecification.metadata,
        };
        if (workspace.functionSpecification.schedule) {
          params.schedule = workspace.functionSpecification.schedule;
        }
        return Superagent.put(url)
          .set('Authorization', `Bearer ${this.account.token}`)
          .timeout(this.requestTimeout)
          .send(params);
      })
      .then(res => {
        let build = res.body as IBuildStatus;
        if (res.status === 200) {
          // Completed synchronously)
          if (build.error) {
            workspace.buildError(build.error);
          } else {
            build.url = `${(<IAccount>self.account).baseUrl}api/v1/run/${workspace.functionSpecification.boundary}/${
              workspace.functionSpecification.name
            }`;
            workspace.buildFinished(build);
          }
          return build;
        }
        if (res.status === 204) {
          // Completed synchronously, no changes
          build = {
            url: `${(<IAccount>self.account).baseUrl}api/v1/run/${workspace.functionSpecification.boundary}/${
              workspace.functionSpecification.name
            }`,
            status: 'unchanged',
            name: workspace.functionSpecification.name,
            boundary: workspace.functionSpecification.boundary,
          };
          workspace.buildFinished(build);
          return build;
        }
        return waitForBuild(build);
      })
      .catch(err => {
        if (!(err instanceof BuildError)) {
          workspace.buildError(err);
        }
        throw err;
      });

    const waitForBuild = (build: IBuildStatus): Promise<IBuildStatus> => {
      const elapsed = Date.now() - startTime;
      build.progress = Math.min(elapsed / this.buildTimeout, 1);
      workspace.buildProgress(build);
      if (elapsed > this.buildTimeout) {
        throw new Error(`Build process did not complete within the ${this.buildTimeout}ms timeout.`);
      }
      return new Promise(resolve => setTimeout(resolve, this.buildStatusCheckInterval))
        .then(() => {
          // @ts-ignore
          const url = `${this.account.baseUrl}api/v1/function/${workspace.functionSpecification.boundary}/${
            workspace.functionSpecification.name
          }/build/${build.build_id}`;
          return (
            Superagent.get(url)
              // @ts-ignore
              .set('Authorization', `Bearer ${self.account.token}`)
              .ok(res => res.status === 200 || res.status === 201 || res.status === 410)
              .timeout(this.requestTimeout)
          );
        })
        .then(res => {
          if (res.status === 200) {
            // success
            // @ts-ignore
            res.body.url = `${self.account.baseUrl}api/v1/run/${workspace.functionSpecification.boundary}/${
              workspace.functionSpecification.name
            }`;
            workspace.buildFinished(res.body);
            return res.body;
          } else if (res.status === 410) {
            // failure
            workspace.buildFinished(res.body);
            throw new BuildError(res.body);
          } else {
            // wait some more
            return waitForBuild(res.body);
          }
        });
    };
  }

  public runFunction(workspace: Workspace): Promise<ServerResponse> {
    return this.accountResolver(this.account)
      .then(newAccount => {
        this.account = this._normalizeAccount(newAccount);
        const url = `${this.account.baseUrl}api/v1/run/${workspace.functionSpecification.boundary}/${
          workspace.functionSpecification.name
        }`;

        workspace.startRun(url);

        function runnerFactory(ctx: object) {
          const Superagent = Superagent1; // tslint:disable-line
          return eval(workspace.getRunnerContent())(ctx); // tslint:disable-line
        }

        const runnerPromise = runnerFactory({
          url,
          configuration: workspace.functionSpecification.configuration,
        });

        return runnerPromise;
      })
      .catch(error => {
        workspace.finishRun(error);
        throw error;
      })
      .then(res => {
        workspace.finishRun(undefined, res);
        return res;
      });
  }

  public attachServerLogs(workspace: Workspace): Promise<Server> {
    if (this.sse) {
      return Promise.resolve(this);
    } else {
      clearTimeout(this.logsTimeout);
      return this.accountResolver(this.account).then(newAccount => {
        this.account = this._normalizeAccount(newAccount);
        const url = `${this.account.baseUrl}api/v1/logs/${workspace.functionSpecification.boundary}/${
          workspace.functionSpecification.name
        }?token=${this.account.token}`;

        this.sse = new EventSource(url);
        if (this.logsBackoff === 0) {
          this.logsBackoff = logsInitialBackoff;
        }
        this.sse.addEventListener('log', e => {
          // @ts-ignore
          if (e && e.data) {
            // @ts-ignore
            workspace.serverLogsEntry(e.data);
          }
        });
        this.sse.onopen = () => workspace.serverLogsAttached();
        this.sse.onerror = e => {
          const backoff = this.logsBackoff;
          const msg =
            'Server logs detached due to error. Re-attempting connection in ' + Math.floor(backoff / 1000) + 's.';
          console.error(msg, e);
          this.detachServerLogs(workspace, new Error(msg));
          this.logsBackoff = Math.min(backoff * logsExponentialBackoff, logsMaxBackoff);
          // @ts-ignore
          this.logsTimeout = setTimeout(() => this.attachServerLogs(workspace), backoff);
        };

        // Re-connect to logs every 5 minutes
        // @ts-ignore
        this.logsTimeout = setTimeout(() => {
          this.detachServerLogs(workspace);
          this.attachServerLogs(workspace);
        }, 5 * 60 * 1000);

        return Promise.resolve(this);
      });
    }
  }

  public detachServerLogs(workspace: Workspace, error?: Error) {
    clearTimeout(this.logsTimeout);
    this.logsTimeout = undefined;
    this.logsBackoff = 0;
    if (this.sse) {
      this.sse.close();
      this.sse = undefined;
      workspace.serverLogsDetached(error);
    }
  }
}
