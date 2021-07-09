import { ServerResponse } from 'http';
import * as Superagent from 'superagent';
import { EditorContext } from './EditorContext';
import { IntegrationEditorContext } from './IntegrationEditorContext';

import * as Options from './Options';
import { ICreateEditorOptions } from './CreateEditor';
import { IIntegrationSpecification } from './IntegrationSpecification';

import { IError } from './Events';

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
export class EntityServer extends Server<IIntegrationSpecification> {
  public entityType: string;

  /**
   * Creates an instance of the _Server_ using a dynamic [[AsyncResolver]] callback to resolve credentials.
   * This is used in situations where the access token is expected to change and must be refreshed during
   * the lifetime of the end user's interaction with the editor, for example due to expiry.
   * @param accountResolver The callback _Server_ will invoke before every Fusebit HTTP API call to ensure it
   * has fresh credentials.
   * @param entitType The type of the entity that's being presented.
   */
  constructor(entityType: string, public accountResolver: AccountResolver) {
    super(accountResolver);
    this.entityType = entityType;
  }

  /**
   * Creates an instance of the _Server_ using static Fusebit HTTP API credentials. This is used in situations where the
   * access token is known ahead of time and will not change during the user's session with the editor.
   * @param account Static credentials to the Fusebit HTTP APIs.
   */
  public static async create(entityType: string, account: IAccount): Promise<Server<IIntegrationSpecification>> {
    // TODO: Support re-resolving credentials, which may or may not have originally worked...
    return new EntityServer(entityType, (currentAccount) => Promise.resolve(account));
  }

  /**
   * Obtains the execution URL of the function.
   * @param boundaryId The name of the function boundary.
   * @param id The name of the function.
   */
  public async getFunctionUrl(boundaryId: string, id: string): Promise<string> {
    const account = await this.accountResolver(this.account);
    return `${account.baseUrl}v2/account/${account.accountId}/subscription/${account.subscriptionId}/${this.entityType}/${id}`;
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
  public loadEditorContext = async (
    boundaryId: string,
    id: string,
    createIfNotExist?: ICreateEditorOptions
  ): Promise<EditorContext<IIntegrationSpecification>> => {
    const createEditorContext = (specification?: IIntegrationSpecification) => {
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
      if (!specification) {
        throw new Error('Specification required right now');
      }

      const editorContext = new IntegrationEditorContext(this, specification);
      editorContext.getMetadata().editor = editorOptions;
      return editorContext;
    };
    return this.accountResolver(this.account)
      .then((newAccount) => {
        this.account = this._normalizeAccount(newAccount);
        const url = `${this.account.baseUrl}v2/account/${this.account.accountId}/subscription/${this.account.subscriptionId}/${this.entityType}/${id}`;
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
        throw new Error(
          `Fusebit editor failed to load ${this.entityType} ${id} because it does not exist, and IEditorCreationOptions were not specified. Specify IEditorCreationOptions to allow a function to be created if one does not exist.`
        );
      });
  };

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

  public buildFunction = (editorContext: EditorContext<any>): Promise<IBuildStatus> => {
    let startTime: number;
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
          const url = `${this.account.baseUrl}v2/account/${this.account.accountId}/subscription/${this.account.subscriptionId}/operation/${build.buildId}`;
          return (
            Superagent.get(url)
              // @ts-ignore
              .set('Authorization', `Bearer ${this.account.accessToken}`)
              .set('x-user-agent', userAgent)
              .ok((res) => true)
              .timeout(this.requestTimeout)
          );
        })
        .then((res) => {
          if (res.status === 200) {
            // success
            build.status = 'completed';
            editorContext.buildFinished(build);
            return build;
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
        const url = `${this.account.baseUrl}v2/account/${this.account.accountId}/subscription/${this.account.subscriptionId}/${this.entityType}/${editorContext.functionId}`;
        startTime = Date.now();
        const params = editorContext.getSpecification();
        return Superagent.put(url)
          .set('Authorization', `Bearer ${this.account.accessToken}`)
          .set('x-user-agent', userAgent)
          .timeout(this.requestTimeout)
          .ok((res) => true)
          .send(params);
      })
      .then((res) => {
        const build: IBuildStatus = {
          buildId: res.body.operationId,
          subscriptionId: this.account!.subscriptionId,
          boundaryId: this.entityType,
          functionId: editorContext.functionId,
          status: 'building',
        };
        return waitForBuild(build);
      })
      .catch((err) => {
        if (!(err instanceof BuildError)) {
          editorContext.buildError(err);
        }
        throw err;
      });
  };

  public async runFunction(editorContext: EditorContext<any>): Promise<ServerResponse> {
    const response = { statusCode: 200, statusMessage: 'Not yet implemented' };
    return response as ServerResponse;
  }

  public attachServerLogs(editorContext: EditorContext<any>): Promise<EntityServer> {
    if (this.sse) {
      return Promise.resolve(this);
    } else {
      clearTimeout(this.logsTimeout);
      return this.accountResolver(this.account).then((newAccount) => {
        this.account = this._normalizeAccount(newAccount);
        const url = `${this.account.baseUrl}v1/account/${this.account.accountId}/subscription/${this.account.subscriptionId}/boundary/${this.entityType}/function/${editorContext.functionId}/log?token=${this.account.accessToken}`;

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
