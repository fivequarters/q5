import { ServerResponse } from 'http';
import * as Superagent from 'superagent';
import { EditorContext, BaseEditorContext } from './EditorContext';
import { IntegrationEditorContext } from './IntegrationEditorContext';

import * as Options from './Options';
import { ICreateEditorOptions } from './CreateEditor';
import { IIntegrationSpecification } from './IntegrationSpecification';

import { IError } from './Events';

import { BaseServer, AccountResolver, IBuildStatus, userAgent, BuildError, IAccount } from './server';

export class EntityServer extends BaseServer<IIntegrationSpecification> {
  public entityType: string;

  constructor(entityType: string, public accountResolver: AccountResolver) {
    super(accountResolver);
    this.entityType = entityType;
  }

  /**
   * Creates an instance of the _EntityServer_ using static Fusebit HTTP API credentials. This is used in
   * situations where the access token is known ahead of time and will not change during the user's session
   * with the editor.
   * @param account Static credentials to the Fusebit HTTP APIs.
   */
  public static async create(entityType: string, account: IAccount): Promise<BaseServer<IIntegrationSpecification>> {
    // TODO: Support re-resolving credentials, which may or may not have originally worked...
    return new EntityServer(entityType, (currentAccount) => Promise.resolve(account));
  }

  public async getFunctionUrl(boundaryId: string, id: string): Promise<string> {
    const account = await this.accountResolver(this.account);
    return `${account.baseUrl}v2/account/${account.accountId}/subscription/${account.subscriptionId}/${this.entityType}/${id}`;
  }

  public loadEditorContext = async (
    boundaryId: string,
    id: string,
    createIfNotExist?: ICreateEditorOptions
  ): Promise<BaseEditorContext<IIntegrationSpecification>> => {
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
        throw new Error(`Fusebit editor failed to load ${this.entityType} ${id} because it does not exist.`);
      });
  };

  public buildFunction = (editorContext: EditorContext): Promise<IBuildStatus> => {
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
            build.location = `${this.entityType}/${editorContext.functionId}`;
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

  public async runFunction(editorContext: EditorContext): Promise<ServerResponse> {
    const response = { statusCode: 200, statusMessage: 'Not yet implemented' };
    return response as ServerResponse;
  }

  public getServerLogUrl = (account: IAccount, editorContext: EditorContext): string => {
    return `${account.baseUrl}v1/account/${account.accountId}/subscription/${account.subscriptionId}/boundary/${this.entityType}/function/${editorContext.functionId}/log?token=${account.accessToken}`;
  };
}
