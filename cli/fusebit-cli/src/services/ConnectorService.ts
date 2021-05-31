import { join } from 'path';
import moment from 'moment';
import globby from 'globby';

import { readFile, readDirectory, exists, copyDirectory, writeFile } from '@5qtrs/file';
import { request, IHttpResponse } from '@5qtrs/request';

import { Text } from '@5qtrs/text';
import { IFusebitExecutionProfile } from '@5qtrs/fusebit-profile-sdk';
import { IExecuteInput, Confirm } from '@5qtrs/cli';
import { ProfileService } from './ProfileService';
import { ExecuteService } from './ExecuteService';

const FusebitStateFile = '.fusebit-state';
const FusebitMetadataFile = 'fusebit.json';

const DefaultIgnores = ['node_modules', FusebitStateFile, FusebitMetadataFile];

interface IConnectorSpec {
  id: string;
  data: {
    configuration: {
      package?: string;
      muxIntegration?: {
        accountId?: string;
        subscriptionId?: string;
        id?: string;
      };
    };
    files: { [fileName: string]: string };
  };
  tags: { [key: string]: string };
  version?: string;
  expires?: moment.Moment;
  expiresDuration?: moment.Duration;
}

export interface IFusebitConnectorListOptions {
  next?: string;
  count?: number;
}

export interface IFusebitConnectorListResult {
  items: IConnectorSpec[];
  next?: string;
}

export class ConnectorService {
  private profileService: ProfileService;
  private executeService: ExecuteService;
  private input: IExecuteInput;

  private constructor(profileService: ProfileService, executeService: ExecuteService, input: IExecuteInput) {
    this.input = input;
    this.profileService = profileService;
    this.executeService = executeService;
  }

  public static async create(input: IExecuteInput) {
    const executeService = await ExecuteService.create(input);
    const profileService = await ProfileService.create(input);
    return new ConnectorService(profileService, executeService, input);
  }

  public createEmptySpec(): IConnectorSpec {
    return {
      id: 'unknown id',
      data: { configuration: { muxIntegration: {} }, files: {} },
      tags: {},
    };
  }

  public async loadDirectory(path: string): Promise<IConnectorSpec> {
    const entitySpec: IConnectorSpec = this.createEmptySpec();

    const cwd = path || process.cwd();

    // Grab the version from the .fusebit-state file, if present.
    try {
      const buffer = await readFile(join(cwd, FusebitStateFile));
      const version = JSON.parse(buffer.toString());

      entitySpec.version = version.version;
    } catch (error) {
      // do nothing
    }

    // Load package.json, if any.
    let pack: any;
    try {
      const buffer = await readFile(join(cwd, 'package.json'));
      pack = JSON.parse(buffer.toString());
      entitySpec.data.files['package.json'] = buffer.toString();
    } catch (error) {
      // do nothing
    }

    // Load fusebit.json, if any.
    try {
      const buffer = await readFile(join(cwd, FusebitMetadataFile));
      const config = JSON.parse(buffer.toString());
      entitySpec.data.configuration = config.configuration;
      entitySpec.tags = config.tags;
      entitySpec.expires = config.expires;
      entitySpec.expiresDuration = config.expiresDuration;
    } catch (error) {
      // do nothing
    }

    // Load files in package.files, if any, into the entitySpec.
    const files = await globby((pack && pack.files) || ['*.js'], { cwd, gitignore: true, ignore: DefaultIgnores });
    await Promise.all(
      files.map(async (filename: string) => {
        entitySpec.data.files[filename] = (await readFile(filename)).toString();
      })
    );
    return entitySpec;
  }

  public async writeDirectory(path: string, spec: IConnectorSpec): Promise<void> {
    const cwd = path || process.cwd();

    // Write the version, if present
    if (spec.version) {
      await writeFile(join(cwd, FusebitStateFile), JSON.stringify({ version: spec.version }));
    }

    // Reconstruct the fusebit.json file
    const fusebit: any = {};
    fusebit.configuration = (spec.data && spec.data.configuration) || {};
    fusebit.tags = spec.tags;
    fusebit.expires = spec.expires;
    fusebit.expiresDuration = spec.expiresDuration;
    await writeFile(join(cwd, FusebitMetadataFile), JSON.stringify(fusebit, null, 2));

    // Write all of the files in the specification
    if (spec.data && spec.data.files) {
      await Promise.all(
        Object.entries(spec.data.files).map(async ([filename, contents]: string[]) => {
          await writeFile(join(cwd, filename), contents);
        })
      );
    }
  }

  public async confirmDeploy(path: string, connectorSpec: any, connectorId: string): Promise<void> {
    if (!this.input.options.quiet) {
      const files = connectorSpec.data.files || [];
      if (files.length) {
        const confirmPrompt = await Confirm.create({
          header: 'Deploy?',
          message: Text.create("Deploy the connector in the '", Text.bold(path), "' directory?"),
        });
        const confirmed = await confirmPrompt.prompt(this.input.io);
        if (!confirmed) {
          await this.executeService.warning(
            'Deploy Canceled',
            Text.create("Deploying the '", Text.bold(connectorId), "' connector was canceled")
          );
          throw new Error('Deploy Canceled');
        }
      }
    }
  }

  public getUrl(profile: IFusebitExecutionProfile, connectorId: string = ''): string {
    return `${profile.baseUrl}/v2/account/${profile.account}/subscription/${profile.subscription}/connector/${connectorId}`;
  }

  public async getConnector(profile: IFusebitExecutionProfile, connectorId: string): Promise<IHttpResponse> {
    return request({
      method: 'GET',
      url: this.getUrl(profile, connectorId),
      headers: {
        Authorization: `Bearer ${profile.accessToken}`,
      },
    });
  }

  public async fetchConnector(connectorId: string): Promise<IConnectorSpec> {
    const profile = await this.profileService.getExecutionProfile(['account', 'subscription']);
    return this.executeService.executeRequest(
      {
        header: 'Getting Connector',
        message: Text.create("Getting existing connector '", Text.bold(`${connectorId}`), "'..."),
        errorHeader: 'Get Connector Error',
        errorMessage: Text.create("Unable to get connector '", Text.bold(`${connectorId}`), "'"),
      },
      {
        method: 'GET',
        url: this.getUrl(profile, connectorId),
        headers: {
          Authorization: `Bearer ${profile.accessToken}`,
        },
      }
    );
  }

  public async deployConnector(connectorId: string, connectorSpec: IConnectorSpec) {
    const profile = await this.profileService.getExecutionProfile(['account', 'subscription']);

    let method: string = 'POST';
    let url: string = this.getUrl(profile);

    connectorSpec.id = connectorId;

    await this.executeService.execute(
      {
        header: 'Checking Connector',
        message: Text.create("Checking existing connector '", Text.bold(`${connectorId}`), "'..."),
        errorHeader: 'Check Connector Error',
        errorMessage: Text.create("Unable to check connector '", Text.bold(`${connectorId}`), "'"),
      },
      async () => {
        const response = await this.getConnector(profile, connectorId);
        if (response.status === 200) {
          method = 'PUT';
          url = this.getUrl(profile, connectorId);
          return;
        } else if (response.status === 404) {
          return;
        }
        throw new Error(`Unexpected response ${response.status}`);
      }
    );

    return this.executeService.executeRequest(
      {
        header: 'Deploy Connector',
        message: Text.create("Deploying connector '", Text.bold(`${connectorId}`), "'..."),
        errorHeader: 'Deploy Connector Error',
        errorMessage: Text.create("Unable to deploy connector '", Text.bold(`${connectorId}`), "'"),
      },
      {
        method,
        url,
        headers: {
          Authorization: `Bearer ${profile.accessToken}`,
        },
        data: connectorSpec,
      }
    );
  }

  public async listConnectors(options: IFusebitConnectorListOptions): Promise<IFusebitConnectorListResult> {
    const profile = await this.profileService.getExecutionProfile(['subscription']);
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
        header: 'List Connectors',
        message: Text.create('Listing connectors...'),
        errorHeader: 'List Connectors Error',
        errorMessage: Text.create('Unable to list connectors'),
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
    const result = await this.input.io.prompt({ prompt: 'Get More Connectors?', yesNo: true });
    return result.length > 0;
  }

  public async displayConnectors(items: IConnectorSpec[], firstDisplay: boolean) {
    if (!items.length) {
      await this.executeService.info('No Connectors', `No ${firstDisplay ? '' : 'more '}connectors to list`);
      return;
    }

    for (const item of items) {
      const tagSummary = ['Tags:', Text.eol()];

      Object.keys(item.tags).forEach((tagKey) => {
        tagSummary.push(Text.dim('• '));
        tagSummary.push(tagKey);
        tagSummary.push(Text.dim(': '));
        tagSummary.push(item.tags[tagKey]);
        tagSummary.push(Text.eol());
      });

      // const itemList = Text.join(functions, Text.eol());
      await this.executeService.message(
        Text.bold(item.id),
        Text.create([
          `Package: `,
          Text.bold(item.data.configuration.package || ''),
          Text.eol(),
          Text.eol(),
          ...tagSummary,
          Text.eol(),
          'Version',
          Text.dim(': '),
          item.version || 'unknown',
          Text.eol(),
        ])
      );
    }
  }

  public async confirmRemove(connectorId: string): Promise<void> {
    if (!this.input.options.quiet) {
      const confirmPrompt = await Confirm.create({
        header: 'Remove?',
        message: Text.create("Permanently remove the '", Text.bold(connectorId), "' connector?"),
      });
      const confirmed = await confirmPrompt.prompt(this.input.io);
      if (!confirmed) {
        await this.executeService.warning(
          'Remove Canceled',
          Text.create("Removing the '", Text.bold(connectorId), "' connector was canceled")
        );
        throw new Error('Remove Canceled');
      }
    }
  }

  public async removeConnector(connectorId: string): Promise<void> {
    const profile = await this.profileService.getExecutionProfile(['account', 'subscription']);

    await this.executeService.executeRequest(
      {
        header: 'Remove Connector',
        message: Text.create("Removing connector '", Text.bold(`${connectorId}`), "'..."),
        errorHeader: 'Remove Connector Error',
        errorMessage: Text.create(
          "Unable to remove connector '",
          Text.bold(`${profile.connector}`),
          "' in boundary '",
          Text.bold(`${profile.boundary}`),
          "'"
        ),
      },
      {
        method: 'DELETE',
        url: this.getUrl(profile, connectorId),
        headers: { Authorization: `bearer ${profile.accessToken}` },
      }
    );

    await this.executeService.result(
      'Connector Removed',
      Text.create("Connector '", Text.bold(`${connectorId}`), "' was successfully removed")
    );
  }
}
