import { ServerResponse } from 'http';
import * as Superagent from 'superagent';
import { EditorContext } from './EditorContext';
import { IFunctionSpecification } from './FunctionSpecification';
const Superagent1 = Superagent;

const userAgent = `fusebit-editor/${require('../package.json').version} ${navigator.userAgent}`;

class BuildError extends Error {
  constructor(public details: IBuildStatus) {
    super('Build failed.');
  }
}

/**
 * Represents the Fusebit account to connect to.
 */
export interface IAccount {
  /**
   * Account ID of the Fusebit service.
   */
  accountId: string;
  /**
   * Subscription ID of the Fusebit service.
   */
  subscriptionId: string;
  /**
   * The base URL of the Fusebit HTTP APIs.
   */
  baseUrl: string;
  /**
   * The access token to authorize calls to Fusebit HTTP APIs.
   */
  accessToken: string;
}

/**
 * A callback function implemented by the application embedding the Fusebit editor used
 * to request current access credentials to the Fusebit HTTP APIs. The callback is called before every API call
 * the editor initiates, so the implementation is responsible for any cashing if appropriate.
 *
 * The last value of [[IAccount]] returned from the _AccountResolver_ is provided to it as input on subsequent invocation.
 * It is therefore a convenient place to store any additional context beyond what [[IAccount]] requires.
 *
 * In a typical use case, _AccountResolver_ would call an authenticated API on the application's own backend to obtain
 * a new access token for Fusebit HTTP APIs, or initiate an authorization flow with a third party authorization service to
 * obtain such token.
 */
export type AccountResolver = (account: IAccount | undefined) => Promise<IAccount>;

/**
 * Represents the status of the build a function.
 */
export interface IBuildStatus {
  /**
   * Status of the build, which is either 'success' or 'failure'.
   */
  status: string;
  /**
   * Subscription ID
   */
  subscriptionId: string;
  /**
   * Function boundary.
   */
  boundaryId: string;
  /**
   * Function name.
   */
  functionId: string;
  /**
   * Unique build identifier of the build.
   */
  id?: string;
  /**
   * Additional information about the build error in case build failure.
   */
  error?: any;
  /**
   * Build progress, which is a number between 0 and 1.
   */
  progress?: number;
  /**
   * If the build was successful, this indicates the URL to use to invoke the function. Note you should never
   * construct this URL yourself as it may change from build to build.
   */
  location?: string;
}

const logsExponentialBackoff = 1.5;
const logsInitialBackoff = 5000;
const logsMaxBackoff = 60000;

/**
 * The _Server_ class is the only component that directly calls the Fusebit HTTP APIs to manipulate Fusebit functions.
 * It is also responsible for keeping track of the authorization token and requesting the hosting application
 * to refresh it when necessary using the [[AccountResolver]] callback.
 *
 * An instance of the _Server_ class is typically created using the [[constructor]] in cases when the access token
 * is dynamically resolved using the [[AccountResolver]], or using the [[create]] static method when the credentials
 * are known ahead of time and will not change during the time the user interacts with the editor.
 * @ignore Reducing MVP surface area
 */
export class Server {
  /**
   * Creates an instance of the _Server_ using static Fusebit HTTP API credentials. This is used in situations where the
   * access token is known ahead of time and will not change during the user's session with the editor.
   * @param account Static credentials to the Fusebit HTTP APIs.
   */
  public static create(account: IAccount): Server {
    return new Server(currentAccount => Promise.resolve(account));
  }
  /**
   * Current credentials used by the _Server_ to call Fusebit HTTP APIs.
   */
  public account: IAccount | undefined;
  /**
   * Maximum amount of time in milliseconds the [[buildFunction]] method is going to wait for a function build to complete
   * before timing out.
   */
  public buildTimeout: number = 60000;
  /**
   * Interval in milliseconds at which the [[buildFunction]] will poll for the status of an asynchronous function build.
   */
  public buildStatusCheckInterval: number = 5000;
  /**
   * Timeout in milliseconds for calls to Fusebit HTTP APIs.
   */
  public requestTimeout: number = 15000;
  /**
   * @ignore
   */
  public sse?: EventSource = undefined;
  /**
   * @ignore
   */
  public logsBackoff: number = 0;
  /**
   * @ignore
   */
  public logsTimeout?: number = undefined;

  /**
   * Creates an instance of the _Server_ using a dynamic [[AsyncResolver]] callback to resolve credentials.
   * This is used in situations where the access token is expected to change and must be refreshed during
   * the lifetime of the end user's interaction with the editor, for example due to expiry.
   * @param accountResolver The callback _Server_ will invoke before every Fusebit HTTP API call to ensure it has fresh credentials.
   */
  constructor(public accountResolver: AccountResolver) {}

  /**
   * @ignore
   */
  public _normalizeAccount(account: IAccount): IAccount {
    if (!account.baseUrl.match(/\/$/)) {
      account.baseUrl += '/';
    }
    return account;
  }

  /**
   * Obtains the execution URL of the function.
   * @param boundaryId The name of the function boundary.
   * @param id The name of the function.
   */
  public getFunctionUrl(boundaryId: string, id: string): Promise<string> {
    return this.accountResolver(this.account)
      .then(newAccount => {
        this.account = this._normalizeAccount(newAccount);
        const url = `${this.account.baseUrl}v1/account/${this.account.accountId}/subscription/${
          this.account.subscriptionId
        }/boundary/${boundaryId}/function/${id}/location`;
        return Superagent.get(url)
          .set('Authorization', `Bearer ${this.account.accessToken}`)
          .set('x-user-agent', userAgent)
          .timeout(this.requestTimeout);
      })
      .then(res => {
        return res.body.location;
      });
  }

  /**
   * Loads an existing function. If the function does not exist, creates one using the provided template.
   * @param boundaryId The name of the function boundary.
   * @param id The name of the function.
   * @param createIfNotExist A template of a function to create if one does not yet exist.
   */
  public loadEditorContext(
    boundaryId: string,
    id: string,
    createIfNotExist?: IFunctionSpecification
  ): Promise<EditorContext> {
    return this.accountResolver(this.account)
      .then(newAccount => {
        this.account = this._normalizeAccount(newAccount);
        const url = `${this.account.baseUrl}v1/account/${this.account.accountId}/subscription/${
          this.account.subscriptionId
        }/boundary/${boundaryId}/function/${id}`;
        return Superagent.get(url)
          .set('Authorization', `Bearer ${this.account.accessToken}`)
          .set('x-user-agent', userAgent)
          .timeout(this.requestTimeout);
      })
      .then(res => {
        let editorContext = new EditorContext(res.body.boundaryId, res.body.id, res.body);
        editorContext.location = res.body.location;
        return editorContext;
      })
      .catch(error => {
        if (!createIfNotExist) {
          throw error;
        }
        let editorContext = new EditorContext(boundaryId, id, createIfNotExist);
        return this.buildFunction(editorContext).then(_ => editorContext);
      });
  }

  /**
   * Not needed for MVP - builds can only be initiated from editor
   * @param editorContext
   */
  public saveFunction(editorContext: EditorContext): Promise<IBuildStatus> {
    editorContext.setDirtyState(false);
    editorContext.setReadOnly(true);
    return this.buildFunction(editorContext)
      .then(build => {
        editorContext.setReadOnly(false);
        if (build.error) {
          editorContext.setDirtyState(true);
        }
        return build;
      })
      .catch(e => {
        editorContext.setReadOnly(false);
        editorContext.setDirtyState(true);
        throw e;
      });
  }

  /**
   * Not needed for MVP - builds can only be initiated from editor
   * @param editorContext
   */
  public buildFunction(editorContext: EditorContext): Promise<IBuildStatus> {
    let startTime: number;
    let self = this;

    const waitForBuild = (build: IBuildStatus): Promise<IBuildStatus> => {
      const elapsed = Date.now() - startTime;
      build.progress = Math.min(elapsed / this.buildTimeout, 1);
      editorContext.buildProgress(build);
      if (elapsed > this.buildTimeout) {
        throw new Error(`Build process did not complete within the ${this.buildTimeout}ms timeout.`);
      }
      return new Promise(resolve => setTimeout(resolve, this.buildStatusCheckInterval))
        .then(() => {
          // @ts-ignore
          const url = `${this.account.baseUrl}v1/account/${self.account.accountId}/subscription/${
            // @ts-ignore
            self.account.subscriptionId
          }/boundary/${editorContext.boundaryId}/function/${editorContext.functionId}/build/${build.id}`;
          return (
            Superagent.get(url)
              // @ts-ignore
              .set('Authorization', `Bearer ${self.account.accessToken}`)
              .set('x-user-agent', userAgent)
              .ok(res => res.status === 200 || res.status === 201 || res.status === 410)
              .timeout(this.requestTimeout)
          );
        })
        .then(res => {
          if (res.status === 200) {
            // success
            editorContext.buildFinished(res.body);
            return res.body;
          } else if (res.status === 410) {
            // failure
            editorContext.buildFinished(res.body);
            throw new BuildError(res.body);
          } else {
            // wait some more
            return waitForBuild(res.body);
          }
        });
    };

    editorContext.startBuild();

    return this.accountResolver(this.account)
      .then(newAccount => {
        this.account = this._normalizeAccount(newAccount);
        const url = `${this.account.baseUrl}v1/account/${this.account.accountId}/subscription/${
          this.account.subscriptionId
        }/boundary/${editorContext.boundaryId}/function/${editorContext.functionId}`;
        startTime = Date.now();
        let params: any = {
          environment: 'nodejs',
          provider: 'lambda',
          configuration: editorContext.functionSpecification.configuration,
          lambda: editorContext.functionSpecification.lambda,
          nodejs: editorContext.functionSpecification.nodejs,
          metadata: editorContext.functionSpecification.metadata,
        };
        if (
          editorContext.functionSpecification.schedule &&
          Object.keys(editorContext.functionSpecification.schedule).length > 0
        ) {
          params.schedule = editorContext.functionSpecification.schedule;
        }
        return Superagent.put(url)
          .set('Authorization', `Bearer ${this.account.accessToken}`)
          .set('x-user-agent', userAgent)
          .timeout(this.requestTimeout)
          .send(params);
      })
      .then(res => {
        let build = res.body as IBuildStatus;
        if (res.status === 204) {
          // No changes
          editorContext.buildFinished(build);
          return build;
        } else if (res.status === 200) {
          // Completed synchronously
          if (build.error) {
            editorContext.buildError(build.error);
          } else {
            editorContext.buildFinished(build);
          }
          return build;
        }
        return waitForBuild(build);
      })
      .catch(err => {
        if (!(err instanceof BuildError)) {
          editorContext.buildError(err);
        }
        throw err;
      });
  }

  /**
   * Not needed for MVP - function can only be run from editor
   * @param editorContext
   * @ignore
   */
  public runFunction(editorContext: EditorContext): Promise<ServerResponse> {
    return this.accountResolver(this.account)
      .then(newAccount => {
        this.account = this._normalizeAccount(newAccount);
        if (editorContext.location) {
          return editorContext.location;
        } else {
          return this.getFunctionUrl(editorContext.boundaryId, editorContext.functionId);
        }
      })
      .then(url => {
        editorContext.location = url;
        editorContext.startRun(url);

        function runnerFactory(ctx: object) {
          const Superagent = Superagent1; // tslint:disable-line
          return eval(editorContext.getRunnerContent())(ctx); // tslint:disable-line
        }

        const runnerPromise = runnerFactory({
          url,
          configuration: editorContext.functionSpecification.configuration,
        });

        return runnerPromise;
      })
      .catch(error => {
        editorContext.finishRun(error);
        throw error;
      })
      .then(res => {
        editorContext.finishRun(undefined, res);
        return res;
      });
  }

  /**
   * Not needed for MVP - logs can only be attached to from editor
   * @param editorContext
   * @ignore
   */
  public attachServerLogs(editorContext: EditorContext): Promise<Server> {
    if (this.sse) {
      return Promise.resolve(this);
    } else {
      clearTimeout(this.logsTimeout);
      return this.accountResolver(this.account).then(newAccount => {
        this.account = this._normalizeAccount(newAccount);
        const url = `${this.account.baseUrl}v1/account/${this.account.accountId}/subscription/${
          this.account.subscriptionId
        }/boundary/${editorContext.boundaryId}/function/${editorContext.functionId}/log?token=${
          this.account.accessToken
        }`;

        this.sse = new EventSource(url);
        if (this.logsBackoff === 0) {
          this.logsBackoff = logsInitialBackoff;
        }
        this.sse.addEventListener('log', e => {
          // @ts-ignore
          if (e && e.data) {
            // @ts-ignore
            editorContext.serverLogsEntry(e.data);
          }
        });
        this.sse.onopen = () => editorContext.serverLogsAttached();
        this.sse.onerror = e => {
          const backoff = this.logsBackoff;
          const msg =
            'Server logs detached due to error. Re-attempting connection in ' + Math.floor(backoff / 1000) + 's.';
          console.error(msg, e);
          this.detachServerLogs(editorContext, new Error(msg));
          this.logsBackoff = Math.min(backoff * logsExponentialBackoff, logsMaxBackoff);
          // @ts-ignore
          this.logsTimeout = setTimeout(() => this.attachServerLogs(editorContext), backoff);
        };

        // Re-connect to logs every 5 minutes
        // @ts-ignore
        this.logsTimeout = setTimeout(() => {
          this.detachServerLogs(editorContext);
          this.attachServerLogs(editorContext);
        }, 5 * 60 * 1000);

        return Promise.resolve(this);
      });
    }
  }

  /**
   * Not needed for MVP - logs can only be detached from by the editor
   * @param editorContext
   * @ignore
   */
  public detachServerLogs(editorContext: EditorContext, error?: Error) {
    clearTimeout(this.logsTimeout);
    this.logsTimeout = undefined;
    this.logsBackoff = 0;
    if (this.sse) {
      this.sse.close();
      this.sse = undefined;
      editorContext.serverLogsDetached(error);
    }
  }
}
