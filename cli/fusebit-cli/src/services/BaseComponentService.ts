import { join } from 'path';
import { createServer } from 'http';
import open from 'open';
import { request, IHttpResponse } from '@5qtrs/request';

import globby from 'globby';
import { readFile, writeFile } from '@5qtrs/file';

import { Text } from '@5qtrs/text';
import { IExecuteInput, Confirm } from '@5qtrs/cli';
import { ProfileService } from './ProfileService';
import { ExecuteService } from './ExecuteService';
import { IFusebitExecutionProfile } from '@5qtrs/fusebit-profile-sdk';

import { FunctionService } from './FunctionService';

import { OperationStatus, EntityType, ISdkEntity, IIntegrationData, IConnectorData } from '@fusebit/schema';

const FusebitStateFile = '.fusebit-state';
const FusebitMetadataFile = 'fusebit.json';
const DefaultIgnores = ['node_modules', FusebitStateFile];
const EditorIp = process.env.FUSEBIT_EDITOR_IP || '127.0.0.1';

export interface ITags {
  [key: string]: string;
}

export interface IBaseComponentType extends ISdkEntity {
  data: IIntegrationData | IConnectorData;

  // Allows an Object.assign instead of an explicit copy over.
  configuration?: never;
}

export interface IListResults<IListResultType> {
  items: IListResultType[];
  next?: string;
}

export interface IListOptions {
  next?: string;
  count?: number;
}

const upperCase = (s: string) => s[0].toUpperCase() + s.substr(1);

export abstract class BaseComponentService<IComponentType extends IBaseComponentType> {
  protected profileService: ProfileService;
  protected executeService: ExecuteService;
  protected input: IExecuteInput;

  protected entityType: EntityType;
  public entityTypeName: string;

  constructor(
    entityType: EntityType,
    profileService: ProfileService,
    executeService: ExecuteService,
    input: IExecuteInput,
    entityTypeName: string
  ) {
    this.input = input;
    this.profileService = profileService;
    this.executeService = executeService;
    this.entityType = entityType;
    this.entityTypeName = entityTypeName;
  }

  public abstract createEmptySpec(): IComponentType;

  public async createNewSpec(): Promise<IComponentType> {
    const profile = await this.profileService.getExecutionProfile(['account', 'subscription']);
    const headers = { Authorization: `bearer ${profile.accessToken}` };
    ExecuteService.addCommonHeaders(headers);
    const response = await request({
      method: 'GET',
      url: this.getUrl(profile, '?defaults=true'),
      headers,
    });

    return response.data.items[0].template;
  }

  public async loadDirectory(path: string): Promise<IComponentType> {
    const entitySpec: IComponentType = this.createEmptySpec();

    const cwd = path || process.cwd();

    // Grab the version from the .fusebit-state file, if present.
    try {
      const buffer = await readFile(join(cwd, FusebitStateFile));
      const version = JSON.parse(buffer.toString());

      entitySpec.version = version.version;
    } catch (error) {
      // do nothing
    }

    const packageJsonBuffer = await readFile(join(cwd, 'package.json'));
    const fusebitJsonBuffer = await readFile(join(cwd, FusebitMetadataFile));

    if (packageJsonBuffer.length === 0 || fusebitJsonBuffer.length === 0) {
      await this.executeService.error(
        `Invalid ${this.entityTypeName}`,
        Text.create(
          `${this.entityTypeName} must have at least two files: 'package.json' and 'fusebit.json'. `,
          'Please, before trying to deploy again, make sure you have those files properly defined. ',
          'For more information, check https://developer.fusebit.io/.'
        )
      );
    }

    // Load package.json, if any.  Only include the type for the files parameter, as that's all that's used
    // here.
    let pack: { files: string[]; encodedFiles?: string[] } | undefined;
    try {
      pack = JSON.parse(packageJsonBuffer.toString());
      entitySpec.data.files['package.json'] = packageJsonBuffer.toString();
    } catch (error) {
      await this.executeService.error(
        `Invalid package.json file`,
        Text.create(
          "We were unable to parse the contents of the 'package.json' file. ",
          'Please, check this file before proceeding again.'
        ),
        error
      );
    }

    // Load files in package.files, if any, into the entitySpec.
    const files = await globby((pack && pack.files) || ['*.js'], { cwd, gitignore: true, ignore: DefaultIgnores });

    await Promise.all(
      files.map(async (filename: string) => {
        const content = await readFile(join(cwd, filename));
        if (!content) {
          return;
        }

        // Encode files with a null in them as base64
        if (content.includes('\u0000')) {
          entitySpec.data.encodedFiles![filename] = {
            data: content.toString('base64'),
            encoding: 'base64',
          };
        } else {
          entitySpec.data.files[filename] = content.toString('utf8');
        }
      })
    );

    // Load files to be encoded in package.encodedFiles, if any, into the entitySpec.
    const encodedFiles = await globby((pack && pack.encodedFiles) || [], {
      cwd,
      gitignore: true,
      ignore: DefaultIgnores,
    });

    await Promise.all(
      encodedFiles.map(async (filename: string) => {
        const content = await readFile(join(cwd, filename));
        if (!content) {
          return;
        }

        // Encode files as base64
        entitySpec.data.encodedFiles![filename] = {
          data: content.toString('base64'),
          encoding: 'base64',
        };
      })
    );

    // Load fusebit.json, if any.
    try {
      const config = JSON.parse(fusebitJsonBuffer);

      // Copy over the metadata values
      entitySpec.id = config.id;
      entitySpec.tags = config.tags;
      entitySpec.expires = config.expires;

      // Clean up the known entries
      delete config.id;
      delete config.tags;
      delete config.expires;
      delete config.files;

      // Blind copy the rest into data.
      Object.assign(entitySpec.data, config);
    } catch (error) {
      await this.executeService.error(
        `Invalid fusebit.json file`,
        Text.create(
          "We were unable to parse the contents of the 'fusebit.json' file. ",
          'Please, check this file before proceeding again.'
        ),
        error
      );
    }

    return entitySpec;
  }

  public async writeDirectory(path: string, spec: IComponentType): Promise<void> {
    const cwd = path || process.cwd();

    // Write the version, if present
    await writeFile(join(cwd, FusebitStateFile), JSON.stringify({ version: spec.version }));
    delete spec.version;

    // Write all of the files in the specification
    await Promise.all(
      Object.entries(spec.data.files).map(async ([filename, content]: [string, any]) => {
        if (typeof content !== 'string') {
          content = JSON.stringify(content, null, 2);
        }

        await writeFile(join(cwd, filename), content);
      })
    );

    // Encoded files win out over non-encoded files when writing.
    await Promise.all(
      Object.entries(spec.data.encodedFiles || {}).map(async ([filename, content]: [string, any]) => {
        // Decode the contents of the buffer.
        content = Buffer.from(content.data, content.encoding);
        await writeFile(join(cwd, filename), content);
      })
    );
    const details = [
      `The ${this.entityTypeName} was downloaded to the ${cwd} directory`,
      ' and the following files were written to disk:',
      Text.eol(),
      Text.eol(),
    ];

    details.push(Text.dim(`• ${FusebitMetadataFile}`));
    details.push(Text.eol());

    Object.keys(spec.data.files).forEach((fileName) => {
      details.push(Text.dim(`• ${fileName}`));
      details.push(Text.eol());
    });

    Object.keys(spec.data.encodedFiles || {}).forEach((fileName) => {
      details.push(Text.dim(`• ${fileName}`));
      details.push(Text.eol());
    });

    delete spec.data.files;
    delete spec.data.encodedFiles;

    // Reconstruct the fusebit.json file
    const config = {
      id: spec.id,
      tags: spec.tags,
      expires: spec.expires,
      ...spec.data,
    };

    await writeFile(join(cwd, FusebitMetadataFile), JSON.stringify(config, null, 2));
    await this.executeService.info(this.entityTypeName, Text.create(details));
  }

  // Right now the entitySpec is left as mostly abstract to try to minimize the unnecessary breakage if
  // additional fields are added to the entity specification.
  public async confirmDeploy(
    path: string,
    entitySpec: { data: { files: { [fileName: string]: string } } },
    entityId: string
  ): Promise<void> {
    if (!this.input.options.quiet) {
      const files = entitySpec.data.files || [];
      if (Object.keys(files).length) {
        const confirmPrompt = await Confirm.create({
          header: 'Deploy?',
          message: Text.create(`Deploy the ${this.entityTypeName} in the '`, Text.bold(path), "' directory?"),
        });
        const confirmed = await confirmPrompt.prompt(this.input.io);
        if (!confirmed) {
          await this.executeService.warning(
            'Deploy Canceled',
            Text.create("Deploying the '", Text.bold(entityId), `' ${this.entityTypeName} was canceled`)
          );
          throw new Error('Deploy Canceled');
        }
      }
    }
  }

  public getUrl(profile: IFusebitExecutionProfile, entityId: string = ''): string {
    return `${profile.baseUrl}/v2/account/${profile.account}/subscription/${profile.subscription}/${this.entityType}/${entityId}`;
  }

  public async getEntity(profile: IFusebitExecutionProfile, entityId: string): Promise<IHttpResponse> {
    const headers = { Authorization: `bearer ${profile.accessToken}` };
    ExecuteService.addCommonHeaders(headers);
    return request({
      method: 'GET',
      url: this.getUrl(profile, entityId),
      headers,
    });
  }

  public async fetchEntity(entityId: string): Promise<IComponentType> {
    const profile = await this.profileService.getExecutionProfile(['account', 'subscription']);
    return this.executeService.executeRequest(
      {
        header: `Getting ${this.entityTypeName}`,
        message: Text.create(`Getting existing ${this.entityTypeName} '`, Text.bold(`${entityId}`), "'..."),
        errorHeader: `Get ${this.entityTypeName} Error`,
        errorMessage: Text.create(`Unable to get ${this.entityTypeName} '`, Text.bold(`${entityId}`), "'"),
      },
      {
        method: 'GET',
        url: this.getUrl(profile, entityId),
        headers: {
          Authorization: `Bearer ${profile.accessToken}`,
        },
      }
    );
  }

  public async deployEntity(entityId: string, entitySpec: IComponentType) {
    const profile = await this.profileService.getExecutionProfile(['account', 'subscription']);

    let method: string = 'POST';
    let url: string = this.getUrl(profile, entityId);

    entitySpec.id = entityId;

    await this.executeService.execute(
      {
        header: `Checking ${this.entityTypeName}`,
        message: Text.create(`Checking existing ${this.entityTypeName} '`, Text.bold(entityId), "'..."),
        errorHeader: `Check ${this.entityTypeName} Error`,
        errorMessage: Text.create(`Unable to check ${this.entityTypeName} '`, Text.bold(entityId), "'"),
      },
      async () => {
        const response = await this.getEntity(profile, entityId);
        if (response.status <= 299) {
          method = 'PUT';
          url = this.getUrl(profile, entityId);
          return;
        } else if (response.status === 404) {
          return;
        }
        throw new Error(`Unexpected response ${response.status}`);
      }
    );

    return this.executeService.executeRequest(
      {
        header: `Deploy ${this.entityTypeName}`,
        message: Text.create(`Deploying ${this.entityTypeName} '`, Text.bold(entityId), "'..."),
        errorHeader: 'Deploy Integration Error',
        errorMessage: Text.create(`Unable to deploy ${this.entityTypeName} '`, Text.bold(entityId), "'"),
      },
      {
        method,
        url,
        headers: {
          Authorization: `Bearer ${profile.accessToken}`,
        },
        data: entitySpec,
      }
    );
  }

  public async listEntities(options: IListOptions): Promise<IListResults<IComponentType>> {
    const profile = await this.profileService.getExecutionProfile(['account', 'subscription']);
    const query = [];
    if (options.count) {
      query.push(`count=${options.count}`);
    }
    if (options.next) {
      query.push(`next=${options.next}`);
    }
    const queryString = `?${query.join('&')}`;

    const result = await this.executeService.executeRequest(
      {
        header: 'List Entities',
        message: Text.create(`Listing ${this.entityTypeName}s...`),
        errorHeader: `List ${this.entityTypeName} Error`,
        errorMessage: Text.create(`Unable to list ${this.entityTypeName}`),
      },
      {
        method: 'GET',
        url: `${this.getUrl(profile)}${queryString}`,
        headers: { Authorization: `bearer ${profile.accessToken}` },
      }
    );

    return result;
  }

  public async confirmListMore(): Promise<boolean> {
    const result = await this.input.io.prompt({ prompt: 'Get More Entities?', yesNo: true });
    return result.length > 0;
  }

  public abstract async displayEntities(items: IBaseComponentType[], firstDisplay: boolean): Promise<void>;

  public async confirmRemove(entityId: string): Promise<void> {
    if (!this.input.options.quiet) {
      const confirmPrompt = await Confirm.create({
        header: 'Remove?',
        message: Text.create("Permanently remove the '", Text.bold(entityId), `' ${this.entityTypeName}?`),
      });
      const confirmed = await confirmPrompt.prompt(this.input.io);
      if (!confirmed) {
        await this.executeService.warning(
          'Remove Canceled',
          Text.create("Removing the '", Text.bold(entityId), `' ${this.entityTypeName} was canceled`)
        );
        throw new Error('Remove Canceled');
      }
    }
  }

  public async removeEntity(entityId: string): Promise<IHttpResponse> {
    const profile = await this.profileService.getExecutionProfile(['account', 'subscription']);

    return this.executeService.executeSimpleRequest(
      {
        header: `Remove ${this.entityTypeName}`,
        message: Text.create(`Removing ${this.entityTypeName} '`, Text.bold(entityId), "'..."),
        errorHeader: `Remove ${this.entityTypeName} Error`,
        errorMessage: Text.create(`Unable to remove ${this.entityTypeName} '`, Text.bold(entityId), "'"),
      },
      {
        method: 'DELETE',
        url: this.getUrl(profile, entityId),
        headers: { Authorization: `bearer ${profile.accessToken}` },
      }
    );
  }

  public async getEntityLogs(entityId: string): Promise<void> {
    const profile = await this.profileService.getExecutionProfile(['account', 'subscription']);

    const functionService = await FunctionService.create(this.input);

    profile.boundary = this.entityType;
    profile.function = entityId;
    return functionService.getFunctionLogsByProfile(profile, this.entityType, this.entityTypeName, false);
  }

  public async startEditServer(entityId: string, theme: string = 'dark', functionSpec?: any) {
    const profile = await this.profileService.getExecutionProfile(['account', 'subscription']);
    profile.function = entityId;
    profile.boundary = this.entityType;

    if (theme !== 'light' && theme !== 'dark') {
      await this.executeService.error(
        `Edit ${this.entityTypeName} Error`,
        Text.create('Unsupported value of the theme parameter')
      );
    }

    const editorHtml = this.getEditorHtml(profile, theme, functionSpec);
    const startServer = (listenPort: number) => {
      return new Promise<void>((resolve, reject) => {
        createServer((req, res) => {
          if (req.method === 'GET') {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            return res.end(editorHtml);
          } else {
            res.writeHead(404);
            return res.end();
          }
        })
          .on('error', reject)
          .listen(listenPort, resolve);
      });
    };

    let attempts = 0;
    const startServerWithRetry = async (): Promise<number> => {
      try {
        attempts++;
        const tryPort = 8000 + Math.floor(Math.random() * 100);
        await startServer(tryPort);
        open(`http://${EditorIp}:${tryPort}`);
        return tryPort;
      } catch (error) {
        if (attempts >= 10) {
          return 0;
        }
        await startServerWithRetry();
      }

      return 0;
    };

    const port = await startServerWithRetry();

    if (!port) {
      await this.executeService.error(
        `Edit ${this.entityTypeName} Error`,
        'Unable to find a free port in the 80xx range to host a local service. Please try again.'
      );
    }

    await this.executeService.result(
      `Edit ${this.entityTypeName}`,
      Text.create(
        "Editing the '",
        Text.bold(`${profile.function}`),
        `' ${this.entityType}.`,
        Text.eol(),
        Text.eol(),
        'Hosting the Fusebit editor at ',
        Text.bold(`http://${EditorIp}:${port}`),
        Text.eol(),
        'If the browser does not open automatically, navigate to this URL.',
        Text.eol(),
        Text.eol(),
        'Ctrl-C to terminate...'
      )
    );

    await new Promise(() => {});
  }

  private getEditorHtml(profile: IFusebitExecutionProfile, theme: string, functionSpec?: any): string {
    const template = functionSpec || {};
    const editorSettings = (functionSpec &&
      functionSpec.metadata &&
      functionSpec.metadata.fusebit &&
      functionSpec.metadata.fusebit.editor) || {
      theme,
      actionPanel: {
        enableRun: false,
      },
      navigationPanel: {
        hideScheduleSettings: true,
        hideRunnerTool: true,
      },
    };

    const fusebitEditorUrl =
      process.env.FUSEBIT_EDITOR_URL || 'https://cdn.fusebit.io/fusebit/js/fusebit-editor/latest/fusebit-editor.min.js';

    return `<!doctype html>
  <html lang="en">
  <head>
    <meta charset="utf-8" />
  
      <link rel="icon" type="image/png" sizes="32x32" href="https://fusebit.io/favicon-32x32.png" />
      <link rel="icon" type="image/png" sizes="16x16" href="https://fusebit.io/favicon-16x16.png" />
      <meta http-equiv="X-UA-Compatible" content="IE=edge,chrome=1" />
  
      <title>${profile.function}</title>
  
      <meta content='width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0' name='viewport' />
      <meta name="viewport" content="width=device-width" />
  
      <style>
          html,body {
              width: 95%;
              height: 95%;
          }
      </style>
  
  </head>
  <body>
      <div id="editor" style="width:800px;height:500px;margin-top:30px;margin-left:auto;margin-right:auto">
  </body>
  
  <script src="${fusebitEditorUrl}"></script>
  <script type="text/javascript">
    // Set it explicitly after getting, so it's easier to discover even if previously unset.
    const enableGrafanaLogs = window.location.search.includes('enableGrafanaLogs') || localStorage.getItem('enableGrafanaLogs') === 'true';
    localStorage.setItem('enableGrafanaLogs', \`\${!!enableGrafanaLogs}\`);

    fusebit.createEditor(document.getElementById('editor'), '${profile.boundary}', '${profile.function}', {
        accountId: '${profile.account}',
        subscriptionId: '${profile.subscription}',
        baseUrl: '${profile.baseUrl}',
        accessToken: '${profile.accessToken}',
    }, {
        template: ${JSON.stringify(template, null, 2)},
        editor: {
          features: {
            enableGrafanaLogs,
          },
          ...${JSON.stringify(editorSettings, null, 2)},
        },
        entityType: '${this.entityType}',
    }).then(editorContext => {
        editorContext.setFullScreen(true);
    });
  </script>
  
  </html>  
  `;
  }

  public async waitForEntity(entityId: string): Promise<IHttpResponse> {
    const profile = await this.profileService.getExecutionProfile(['account', 'subscription']);

    let response = await this.getEntity(profile, entityId);

    if (response.status > 299) {
      return response;
    }

    let entity = response.data;
    let os = entity.operationState;
    let msg = os ? `${os.operation} ${os.errorCode || os.status}: ${os.errorDetails || os.message}` : '';

    if (entity.operationState && entity.operationState.status !== OperationStatus.processing) {
      await this.executeService.result(
        `${this.entityTypeName} ${upperCase(entity.operationState.message)}:`,
        Text.create(`${this.entityTypeName} '`, Text.bold(entityId), `' ${msg}`, Text.eol())
      );
      return response;
    }

    await this.executeService.execute(
      {
        header: ` `,
        message: Text.create("Processing '", Text.bold(`${entityId}`), `'...`, Text.eol()),
        errorHeader: `${this.entityTypeName} Error`,
        errorMessage: Text.create(`${this.entityTypeName} '`, Text.bold(entityId), `' ${msg}`),
      },

      async () => {
        while (entity.operationState && entity.operationState.status === OperationStatus.processing) {
          await new Promise((resolve) => setTimeout(resolve, 500));
          response = await this.getEntity(profile, entityId);
          entity = response.data;
        }
        if (!entity.operationState) {
          return;
        }
        os = entity.operationState;
        msg = `${os.operation} ${os.errorCode || os.status}: ${os.errorDetails || os.message}`;
        if (os.status !== OperationStatus.success) {
          throw new Error(msg);
        }
      }
    );
    return response;
  }
}
