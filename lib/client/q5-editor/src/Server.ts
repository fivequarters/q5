import { Workspace } from './Workspace';
import * as Superagent from 'superagent';
import { ServerResponse } from 'http';
let Superagent1 = Superagent;

class BuildError extends Error {
    constructor(public details: BuildStatus) {
        super('Build failed.');
    }
}

export interface Account {
    baseUrl: string,
    token: string,
}

export interface AccountResolver {
    (account: Account | undefined): Promise<Account>;
}

export interface BuildStatus {
    status: string, 
    boundary: string, 
    name: string, 
    build_id?: string,
    error?: any,
    progress?: number,
    url?: string,
}

export class Server {

    account: Account | undefined;
    buildTimeout: number = 60000;
    buildStatusCheckInterval: number = 5000;
    requestTimeout: number = 15000;

    static create(account: Account): Server {
        return new Server(currentAccount => Promise.resolve(account));
    }

    constructor(public accountResolver: AccountResolver) {}

    _normalizeAccount(account: Account): Account {
        if (!account.baseUrl.match(/\/$/)) {
            account.baseUrl += '/';
        }
        return account;
    }

    getFunctionUrl(workspace: Workspace): string | undefined {
        if (!this.account) {
            return undefined;
        }
        return `${this.account.baseUrl}api/v1/run/${workspace.functionSpecification.boundary}/${workspace.functionSpecification.name}`;
    }

    loadWorkspace(boundary: string, name: string, createIfNotExist?: Workspace): Promise<Workspace> {
        return this.accountResolver(this.account)
            .then(newAccount => {
                this.account = this._normalizeAccount(newAccount);
                let url = `${this.account.baseUrl}api/v1/function/${boundary}/${name}`;
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
                return this.buildFunction(createIfNotExist)
                    .then(_ => createIfNotExist);
            });
    }


    buildFunction(workspace: Workspace): Promise<BuildStatus> {
        let startTime: number;
        let self = this;

        workspace.startBuild();

        return this.accountResolver(this.account)
            .then(newAccount => {
                this.account = this._normalizeAccount(newAccount);
                let url = `${this.account.baseUrl}api/v1/function/${workspace.functionSpecification.boundary}/${workspace.functionSpecification.name}`;
                startTime = Date.now();
                return Superagent.put(url)
                    .set('Authorization', `Bearer ${this.account.token}`)
                    .timeout(this.requestTimeout)
                    .send({
                        environment: 'nodejs',
                        provider: 'lambda',
                        configuration: workspace.functionSpecification.configuration,
                        lambda: workspace.functionSpecification.lambda,
                        nodejs: workspace.functionSpecification.nodejs,
                        metadata: workspace.functionSpecification.metadata,
                    });
            })
            .then(res => {
                let build = <BuildStatus>res.body;
                if (res.status === 200) {
                    // Completed synchronously
                    //@ts-ignore
                    build.url = `${self.account.baseUrl}api/v1/run/${workspace.functionSpecification.boundary}/${workspace.functionSpecification.name}`;
                    workspace.buildFinished(build);
                    return build;
                }
                if (res.status === 204) {
                    // Completed synchronously, no changes
                    build = {
                        //@ts-ignore
                        url: `${self.account.baseUrl}api/v1/run/${workspace.functionSpecification.boundary}/${workspace.functionSpecification.name}`,
                        status: 'unchanged',
                        name: workspace.functionSpecification.name,
                        boundary: workspace.functionSpecification.boundary
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

        function waitForBuild(build: BuildStatus) : Promise<BuildStatus> {
            let elapsed = Date.now() - startTime;
            build.progress = Math.min(elapsed / self.buildTimeout, 1);
            workspace.buildProgress(build);
            if (elapsed > self.buildTimeout) {
                throw new Error(`Build process did not complete within the ${self.buildTimeout}ms timeout.`);
            }
            return new Promise(resolve => setTimeout(resolve, self.buildStatusCheckInterval))
                .then(() => {
                    // @ts-ignore
                    let url = `${self.account.baseUrl}api/v1/function/${workspace.functionSpecification.boundary}/${workspace.functionSpecification.name}/build/${build.build_id}`;
                    return Superagent.get(url)
                        // @ts-ignore
                        .set('Authorization', `Bearer ${self.account.token}`)
                        .ok(res => res.status == 200 || res.status == 201 || res.status == 410)
                        .timeout(self.requestTimeout);
                })
                .then(res => {
                    if (res.status == 200) {
                        // success
                        // @ts-ignore
                        res.body.url = `${self.account.baseUrl}api/v1/run/${workspace.functionSpecification.boundary}/${workspace.functionSpecification.name}`;
                        workspace.buildFinished(res.body);
                        return res.body;
                    }
                    else if (res.status == 410) {
                        // failure
                        workspace.buildFinished(res.body);
                        throw new BuildError(res.body);
                    }
                    else {
                        // wait some more
                        return waitForBuild(res.body);
                    }
                });
        }
    }

    runFunction(workspace: Workspace): Promise<ServerResponse> {
        return this.accountResolver(this.account)
            .then(newAccount => {
                this.account = this._normalizeAccount(newAccount);
                let url = `${this.account.baseUrl}api/v1/run/${workspace.functionSpecification.boundary}/${workspace.functionSpecification.name}`;

                workspace.startRun(url);

                function runnerFactory(ctx: Object) {
                    let Superagent = Superagent1;
                    return eval(workspace.getRunnerContent())(ctx);
                }

                let runnerPromise = runnerFactory({ 
                    url,
                    configuration: workspace.functionSpecification.configuration
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
}
