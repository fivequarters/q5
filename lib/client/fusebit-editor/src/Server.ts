import { ServerResponse } from 'http';
import { EditorContext } from './EditorContext';

import { ICreateEditorOptions } from './CreateEditor';

export const userAgent = `fusebit-editor/${require('../package.json').version} ${navigator.userAgent}`;

export class BuildError extends Error {
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
   * Status of the build, which is either 'success', 'failed', 'pending', 'building' or 'unchanged'.
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
  buildId?: string;
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

export interface IRegistryInfo {
  baseUrl: string;
  token?: string;
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
export abstract class BaseServer<IFuncSpec> {
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
  public abstract getFunctionUrl(boundaryId: string, id: string): Promise<string>;

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
  public abstract loadEditorContext(
    boundaryId: string,
    id: string,
    createIfNotExist?: ICreateEditorOptions
  ): Promise<EditorContext>;

  public abstract runFunction(editorContext: EditorContext): Promise<ServerResponse>;
  public abstract getServerLogUrl(account: IAccount, editorContext: EditorContext): string;
  public abstract buildFunction(editorContext: EditorContext): Promise<IBuildStatus>;

  /**
   * Not needed for MVP - logs can only be attached to from editor
   * @param editorContext
   * @ignore
   */
  public attachServerLogs(editorContext: EditorContext): Promise<BaseServer<IFuncSpec>> {
    const enableNewLogs = editorContext.getMetadata().editor.features?.enableNewLogs;

    if (this.sse || enableNewLogs) {
      return Promise.resolve(this);
    } else {
      clearTimeout(this.logsTimeout);
      return this.accountResolver(this.account).then((newAccount) => {
        this.account = this._normalizeAccount(newAccount);
        const url = this.getServerLogUrl(this.account, editorContext);

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

  public saveFunction(editorContext: EditorContext): Promise<IBuildStatus> {
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
}

export type Server = BaseServer<any>;
