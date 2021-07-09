import { ServerResponse } from 'http';
import * as Superagent from 'superagent';
import { EditorContext } from './EditorContext';
import { FunctionEditorContext } from './FunctionEditorContext';

import * as Options from './Options';
import { ICreateEditorOptions } from './CreateEditor';
import { IFunctionSpecification } from './FunctionSpecification';

import { IError } from './Events';
const Superagent1 = Superagent;

import { Server, AccountResolver, IBuildStatus, userAgent, BuildError, IAccount } from './server';

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
export class FunctionServer extends Server<IFunctionSpecification> {
  /**
   * Creates an instance of the _Server_ using static Fusebit HTTP API credentials. This is used in situations where the
   * access token is known ahead of time and will not change during the user's session with the editor.
   * @param account Static credentials to the Fusebit HTTP APIs.
   */
  public static create(account: IAccount): Server<IFunctionSpecification> {
    return new FunctionServer((currentAccount) => Promise.resolve(account));
  }

  /**
   * Creates an instance of the _Server_ using a dynamic [[AsyncResolver]] callback to resolve credentials.
   * This is used in situations where the access token is expected to change and must be refreshed during
   * the lifetime of the end user's interaction with the editor, for example due to expiry.
   * @param accountResolver The callback _Server_ will invoke before every Fusebit HTTP API call to ensure it
   * has fresh credentials.
   */
  constructor(public accountResolver: AccountResolver) {
    super(accountResolver);
  }

  /**
   * Obtains the execution URL of the function.
   * @param boundaryId The name of the function boundary.
   * @param id The name of the function.
   */
  public getFunctionUrl(boundaryId: string, id: string): Promise<string> {
    return this.accountResolver(this.account)
      .then((newAccount) => {
        this.account = this._normalizeAccount(newAccount);
        const url = `${this.account.baseUrl}v1/account/${this.account.accountId}/subscription/${this.account.subscriptionId}/boundary/${boundaryId}/function/${id}/location`;
        return Superagent.get(url)
          .set('Authorization', `Bearer ${this.account.accessToken}`)
          .set('x-user-agent', userAgent)
          .timeout(this.requestTimeout);
      })
      .then((res) => {
        return res.body.location;
      });
  }

  /**
   * Creates the EditorContext representing a function. If the function already exists, it is loaded.
   * If the function does not exist, behavior depends on ICreateEditorOptions.editor.ensureFunctionExists.
   * When set to false (default), a new EditorContext is created representing the function, but the user
   * must manually save the function for it to be created. If set to true, the function will be created before
   * the EditorContext is returned.
   * @param boundaryId The name of the function boundary.
   * @param id The name of the function.
   * @param createIfNotExist A template of a function to create if one does not yet exist.
   */
  public loadEditorContext(
    boundaryId: string,
    id: string,
    createIfNotExist?: ICreateEditorOptions
  ): Promise<EditorContext<IFunctionSpecification>> {
    const self = this;
    return this.accountResolver(this.account)
      .then((newAccount) => {
        this.account = this._normalizeAccount(newAccount);
        const url = `${this.account.baseUrl}v1/account/${this.account.accountId}/subscription/${this.account.subscriptionId}/boundary/${boundaryId}/function/${id}?include=all`;
        return Superagent.get(url)
          .set('Authorization', `Bearer ${this.account.accessToken}`)
          .set('x-user-agent', userAgent)
          .timeout(this.requestTimeout);
      })
      .then((res) => {
        const editorContext = createEditorContext(res.body);
        return editorContext;
      })
      .catch((error) => {
        if (!createIfNotExist) {
          throw new Error(
            `Fusebit editor failed to load function ${boundaryId}/${id} because it does not exist, and IEditorCreationOptions were not specified. Specify IEditorCreationOptions to allow a function to be created if one does not exist.`
          );
        }
        const editorContext = createEditorContext(createIfNotExist.template);
        if (createIfNotExist.editor && createIfNotExist.editor.ensureFunctionExists) {
          return this.buildFunction(editorContext).then((_) => editorContext);
        } else {
          editorContext.setDirtyState(true);
          return editorContext;
        }
      });

    function createEditorContext(functionSpecification?: IFunctionSpecification) {
      const defaultEditorOptions = new Options.EditorOptions();
      const editorOptions = {
        ...defaultEditorOptions,
        ...(createIfNotExist && createIfNotExist.editor),
        version: require('../package.json').version,
      };
      Object.keys(defaultEditorOptions).forEach((k) => {
        // @ts-ignore
        if (editorOptions[k] !== false && typeof editorOptions[k] !== 'string') {
          // @ts-ignore
          editorOptions[k] = {
            ...defaultEditorOptions[k],
            // @ts-ignore
            ...editorOptions[k],
            theme: editorOptions.theme,
          };
        }
      });
      const editorContext = new FunctionEditorContext(self, boundaryId, id, functionSpecification);
      if ((createIfNotExist && createIfNotExist.editor) || !editorContext._ensureFusebitMetadata().editor) {
        editorContext._ensureFusebitMetadata(true).editor = editorOptions;
      }
      return editorContext;
    }
  }

  /**
   * Not needed for MVP - builds can only be initiated from editor
   * @param editorContext
   */
  public saveFunction(editorContext: EditorContext<any>): Promise<IBuildStatus> {
    editorContext.setDirtyState(false);
    editorContext.setReadOnly(true);
    return this.buildFunction(editorContext)
      .then((build) => {
        editorContext.setReadOnly(false);
        if (build.error) {
          editorContext.setDirtyState(true);
        }
        return build;
      })
      .catch((e) => {
        editorContext.setReadOnly(false);
        editorContext.setDirtyState(true);
        throw e;
      });
  }

  /**
   * Not needed for MVP - builds can only be initiated from editor
   * @param editorContext
   */
  public buildFunction(editorContext: EditorContext<any>): Promise<IBuildStatus> {
    let startTime: number;
    let self = this;

    const waitForBuild = (build: IBuildStatus): Promise<IBuildStatus> => {
      const elapsed = Date.now() - startTime;
      build.progress = Math.min(elapsed / this.buildTimeout, 1);
      editorContext.buildProgress(build);
      if (elapsed > this.buildTimeout) {
        throw new Error(`Build process did not complete within the ${this.buildTimeout}ms timeout.`);
      }
      return new Promise((resolve) => setTimeout(resolve, this.buildStatusCheckInterval))
        .then(() => {
          // @ts-ignore
          const url = `${this.account.baseUrl}v1/account/${self.account.accountId}/subscription/${
            // @ts-ignore
            self.account.subscriptionId
          }/boundary/${editorContext.boundaryId}/function/${editorContext.functionId}/build/${build.buildId}`;
          return (
            Superagent.get(url)
              // @ts-ignore
              .set('Authorization', `Bearer ${self.account.accessToken}`)
              .set('x-user-agent', userAgent)
              .ok((res) => true)
              .timeout(this.requestTimeout)
          );
        })
        .then((res) => {
          if (res.status === 200) {
            // success
            editorContext.buildFinished(res.body);
            return res.body;
          } else if (res.status === 201) {
            // wait some more
            return waitForBuild(res.body);
          } else {
            // failure
            editorContext.buildError((res.body.error || res.body) as IError);
            throw new BuildError(res.body.error || res.body);
          }
        });
    };

    editorContext.startBuild();

    return this.accountResolver(this.account)
      .then((newAccount) => {
        this.account = this._normalizeAccount(newAccount);
        const url = `${this.account.baseUrl}v1/account/${this.account.accountId}/subscription/${this.account.subscriptionId}/boundary/${editorContext.boundaryId}/function/${editorContext.functionId}`;
        startTime = Date.now();
        let params: any = {
          environment: 'nodejs',
          provider: 'lambda',
          configurationSerialized: editorContext.getConfigurationSettings(),
          computeSerialized: editorContext.getComputeSettings(),
          scheduleSerialized: editorContext.getScheduleSettings(),
          nodejs: editorContext.getSpecification().nodejs,
          metadata: editorContext.getSpecification().metadata,
          security: editorContext.getSpecification().security,
        };
        return Superagent.put(url)
          .set('Authorization', `Bearer ${this.account.accessToken}`)
          .set('x-user-agent', userAgent)
          .timeout(this.requestTimeout)
          .ok((res) => true)
          .send(params);
      })
      .then((res) => {
        let build = res.body as IBuildStatus;
        if (res.status === 204) {
          // No changes
          build = {
            status: 'unchanged',
            subscriptionId: (this.account as IAccount).subscriptionId,
            boundaryId: editorContext.boundaryId,
            functionId: editorContext.functionId,
          };
          editorContext.buildFinished(build);
          return build;
        } else if (res.status === 200) {
          // Completed synchronously
          editorContext.buildFinished(build);
          return build;
        } else if (res.status === 201) {
          return waitForBuild(build);
        } else {
          editorContext.buildError((res.body.error || res.body) as IError);
          throw new BuildError(build);
        }
      })
      .catch((err) => {
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
  public runFunction(editorContext: EditorContext<any>): Promise<ServerResponse> {
    return this.accountResolver(this.account)
      .then((newAccount) => {
        this.account = this._normalizeAccount(newAccount);
        if (editorContext.location) {
          return editorContext.location;
        } else {
          return this.getFunctionUrl(editorContext.boundaryId, editorContext.functionId);
        }
      })
      .then((url) => {
        editorContext.location = url;
        editorContext.startRun(url);

        function runnerFactory(ctx: object) {
          const Superagent = Superagent1; // tslint:disable-line
          return eval(editorContext.getRunnerContent())(ctx); // tslint:disable-line
        }

        const runnerPromise = runnerFactory({
          url,
          configuration: editorContext.getConfiguration(),
        });

        return runnerPromise;
      })
      .catch((error) => {
        editorContext.finishRun(error);
        throw error;
      })
      .then((res) => {
        editorContext.finishRun(undefined, res);
        return res;
      });
  }

  /**
   * Not needed for MVP - logs can only be attached to from editor
   * @param editorContext
   * @ignore
   */
  public attachServerLogs(editorContext: EditorContext<any>): Promise<Server<IFunctionSpecification>> {
    if (this.sse) {
      return Promise.resolve(this);
    } else {
      clearTimeout(this.logsTimeout);
      return this.accountResolver(this.account).then((newAccount) => {
        this.account = this._normalizeAccount(newAccount);
        const url = `${this.account.baseUrl}v1/account/${this.account.accountId}/subscription/${this.account.subscriptionId}/boundary/${editorContext.boundaryId}/function/${editorContext.functionId}/log?token=${this.account.accessToken}`;

        this.sse = new EventSource(url);
        if (this.logsBackoff === 0) {
          this.logsBackoff = logsInitialBackoff;
        }
        this.sse.addEventListener('log', (e) => {
          // @ts-ignore
          if (e && e.data) {
            // @ts-ignore
            editorContext.serverLogsEntry(e.data);
          }
        });
        this.sse.onopen = () => editorContext.serverLogsAttached();
        this.sse.onerror = (e) => {
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
  public detachServerLogs(editorContext: EditorContext<any>, error?: Error) {
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
