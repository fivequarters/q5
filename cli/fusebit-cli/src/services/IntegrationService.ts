import { join } from 'path';
import moment from 'moment';
import globby from 'globby';

import { readFile, writeFile } from '@5qtrs/file';
import { request, IHttpResponse } from '@5qtrs/request';

import { Text } from '@5qtrs/text';
import { IFusebitExecutionProfile } from '@5qtrs/fusebit-profile-sdk';
import { IExecuteInput, Confirm } from '@5qtrs/cli';
import { ProfileService } from './ProfileService';
import { ExecuteService } from './ExecuteService';
import { FunctionService } from './FunctionService';

const FusebitStateFile = '.fusebit-state';
const FusebitMetadataFile = 'fusebit.json';

const DefaultIgnores = ['node_modules', FusebitStateFile];

interface IIntegrationSpec {
  id: string;
  data: {
    handler: string;
    configuration: {
      connectors: {
        [name: string]: { package: string; config?: any };
      };
    };
    files: { [fileName: string]: string };
  };
  tags: { [key: string]: string };
  version?: string;
  expires?: string;
  expiresDuration?: string;
}

export interface IFusebitIntegrationListOptions {
  next?: string;
  count?: number;
}

export interface IFusebitIntegrationListResult {
  items: IIntegrationSpec[];
  next?: string;
}

export class IntegrationService {
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
    return new IntegrationService(profileService, executeService, input);
  }

  public createEmptySpec(): IIntegrationSpec {
    return {
      id: 'unknown id',
      data: { handler: './integration', configuration: { connectors: {} }, files: {} },
      tags: {},
    };
  }

  public createNewSpec(): IIntegrationSpec {
    return {
      id: 'default',
      tags: {},
      data: {
        handler: './integration',
        configuration: { connectors: {} },
        files: {
          './integration.js': [
            `const { Router } = require('@fusebit-int/pkg-manager');`,
            ``,
            `const router = new Router();`,
            ``,
            `router.get('/api/', async (ctx) => {`,
            `  ctx.body = 'Hello World';`,
            `});`,
            ``,
            `module.exports = router;`,
          ].join('\n'),
        },
      },
    };
  }

  public async loadDirectory(path: string): Promise<IIntegrationSpec> {
    const entitySpec: IIntegrationSpec = this.createEmptySpec();

    const cwd = path || process.cwd();
    // Load package.json, if any.
    let pack: any;
    try {
      const buffer = await readFile(join(cwd, 'package.json'));
      pack = JSON.parse(buffer.toString());
      entitySpec.data.files['package.json'] = JSON.stringify(pack);
    } catch (error) {
      // do nothing
    }

    // Load fusebit.json, if any.
    try {
      const buffer = await readFile(join(cwd, FusebitMetadataFile));
      const config = JSON.parse(buffer.toString());
      entitySpec.data.handler = config.handler;
      entitySpec.data.configuration = config.configuration;
      entitySpec.tags = config.tags;
      entitySpec.expires = config.expires;
      entitySpec.expiresDuration = config.expiresDuration;
    } catch (error) {
      // do nothing
    }

    // Grab the version from the .fusebit-state file, if present.
    try {
      const buffer = await readFile(join(cwd, FusebitStateFile));
      const version = JSON.parse(buffer.toString());

      entitySpec.version = version.version;
    } catch (error) {
      // do nothing
    }

    // Load files in package.files, if any, into the entitySpec.
    const files = await globby((pack && pack.files) || ['*.js'], { cwd, gitignore: true, ignore: DefaultIgnores });
    await Promise.all(
      files.map(async (filename: string) => {
        entitySpec.data.files[filename] = (await readFile(join(cwd, filename))).toString();
      })
    );
    return entitySpec;
  }

  public async writeDirectory(path: string, spec: IIntegrationSpec): Promise<void> {
    const cwd = path || process.cwd();

    // Write the version, if present
    if (spec.version) {
      await writeFile(join(cwd, FusebitStateFile), JSON.stringify({ version: spec.version }));
    }

    // Write all of the files in the specification
    if (spec.data && spec.data.files) {
      await Promise.all(
        Object.entries(spec.data.files).map(async ([filename, contents]: string[]) => {
          await writeFile(join(cwd, filename), contents);
        })
      );
    }

    // Reconstruct the fusebit.json file
    const fusebit: any = {};
    fusebit.handler = (spec.data && spec.data.handler) || '';
    fusebit.configuration = (spec.data && spec.data.configuration) || {};
    fusebit.tags = spec.tags;
    fusebit.expires = spec.expires;
    fusebit.expiresDuration = spec.expiresDuration;
    await writeFile(join(cwd, FusebitMetadataFile), JSON.stringify(fusebit, null, 2));
  }

  public async confirmDeploy(path: string, integrationSpec: any, integrationId: string): Promise<void> {
    if (!this.input.options.quiet) {
      const files = integrationSpec.data.files || [];
      if (files.length) {
        const confirmPrompt = await Confirm.create({
          header: 'Deploy?',
          message: Text.create("Deploy the integration in the '", Text.bold(path), "' directory?"),
        });
        const confirmed = await confirmPrompt.prompt(this.input.io);
        if (!confirmed) {
          await this.executeService.warning(
            'Deploy Canceled',
            Text.create("Deploying the '", Text.bold(integrationId), "' integration was canceled")
          );
          throw new Error('Deploy Canceled');
        }
      }
    }
  }

  public getUrl(profile: IFusebitExecutionProfile, integrationId: string = ''): string {
    return `${profile.baseUrl}/v2/account/${profile.account}/subscription/${profile.subscription}/integration/${integrationId}`;
  }

  public async getIntegration(profile: IFusebitExecutionProfile, integrationId: string): Promise<IHttpResponse> {
    return request({
      method: 'GET',
      url: this.getUrl(profile, integrationId),
      headers: {
        Authorization: `Bearer ${profile.accessToken}`,
      },
    });
  }

  public async fetchIntegration(integrationId: string): Promise<IIntegrationSpec> {
    const profile = await this.profileService.getExecutionProfile(['account', 'subscription']);
    return this.executeService.executeRequest(
      {
        header: 'Getting Integration',
        message: Text.create("Getting existing integration '", Text.bold(`${integrationId}`), "'..."),
        errorHeader: 'Get Integration Error',
        errorMessage: Text.create("Unable to get integration '", Text.bold(`${integrationId}`), "'"),
      },
      {
        method: 'GET',
        url: this.getUrl(profile, integrationId),
        headers: {
          Authorization: `Bearer ${profile.accessToken}`,
        },
      }
    );
  }

  public async deployIntegration(integrationId: string, integrationSpec: IIntegrationSpec) {
    const profile = await this.profileService.getExecutionProfile(['account', 'subscription']);

    let method: string = 'POST';
    let url: string = this.getUrl(profile);

    integrationSpec.id = integrationId;

    await this.executeService.execute(
      {
        header: 'Checking Integration',
        message: Text.create("Checking existing integration '", Text.bold(`${integrationId}`), "'..."),
        errorHeader: 'Check Integration Error',
        errorMessage: Text.create("Unable to check integration '", Text.bold(`${integrationId}`), "'"),
      },
      async () => {
        const response = await this.getIntegration(profile, integrationId);
        if (response.status === 200) {
          method = 'PUT';
          url = this.getUrl(profile, integrationId);
          return;
        } else if (response.status === 404) {
          return;
        }
        throw new Error(`Unexpected response ${response.status}`);
      }
    );

    return this.executeService.executeRequest(
      {
        header: 'Deploy Integration',
        message: Text.create("Deploying integration '", Text.bold(`${integrationId}`), "'..."),
        errorHeader: 'Deploy Integration Error',
        errorMessage: Text.create("Unable to deploy integration '", Text.bold(`${integrationId}`), "'"),
      },
      {
        method,
        url,
        headers: {
          Authorization: `Bearer ${profile.accessToken}`,
        },
        data: integrationSpec,
      }
    );
  }

  public async listIntegrations(options: IFusebitIntegrationListOptions): Promise<IFusebitIntegrationListResult> {
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
        header: 'List Integrations',
        message: Text.create('Listing integrations...'),
        errorHeader: 'List Integrations Error',
        errorMessage: Text.create('Unable to list integrations'),
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
    const result = await this.input.io.prompt({ prompt: 'Get More Integrations?', yesNo: true });
    return result.length > 0;
  }

  public async displayIntegrations(items: IIntegrationSpec[], firstDisplay: boolean) {
    const profile = await this.profileService.getExecutionProfile(['account', 'subscription']);
    if (!items.length) {
      await this.executeService.info('No Integrations', `No ${firstDisplay ? '' : 'more '}integrations to list`);
      return;
    }

    for (const item of items) {
      const tagSummary = Object.keys(item.tags).length > 0 ? ['Tags:', Text.eol()] : [];
      const expiresSummary = item.expires ? ['Expires: ', Text.bold(item.expires), Text.eol(), Text.eol()] : [];

      Object.keys(item.tags).forEach((tagKey) => {
        tagSummary.push(Text.dim('• '));
        tagSummary.push(tagKey);
        tagSummary.push(Text.dim(': '));
        tagSummary.push(item.tags[tagKey]);
        tagSummary.push(Text.eol());
      });

      if (tagSummary.length > 0) {
        tagSummary.push(Text.eol());
      }

      await this.executeService.message(
        Text.bold(item.id),
        Text.create([
          `Handler: `,
          Text.bold(item.data.handler || ''),
          Text.eol(),
          Text.eol(),
          ...tagSummary,
          ...expiresSummary,
          'Version',
          Text.dim(': '),
          item.version || 'unknown',
          Text.eol(),
          Text.eol(),
          'Base URL',
          Text.dim(': '),
          this.getUrl(profile, item.id),
        ])
      );
    }
  }

  public async confirmRemove(integrationId: string): Promise<void> {
    if (!this.input.options.quiet) {
      const confirmPrompt = await Confirm.create({
        header: 'Remove?',
        message: Text.create("Permanently remove the '", Text.bold(integrationId), "' integration?"),
      });
      const confirmed = await confirmPrompt.prompt(this.input.io);
      if (!confirmed) {
        await this.executeService.warning(
          'Remove Canceled',
          Text.create("Removing the '", Text.bold(integrationId), "' integration was canceled")
        );
        throw new Error('Remove Canceled');
      }
    }
  }

  public async removeIntegration(integrationId: string): Promise<void> {
    const profile = await this.profileService.getExecutionProfile(['account', 'subscription']);

    await this.executeService.executeRequest(
      {
        header: 'Remove Integration',
        message: Text.create("Removing integration '", Text.bold(`${integrationId}`), "'..."),
        errorHeader: 'Remove Integration Error',
        errorMessage: Text.create(
          "Unable to remove integration '",
          Text.bold(`${profile.integration}`),
          "' in boundary '",
          Text.bold(`${profile.boundary}`),
          "'"
        ),
      },
      {
        method: 'DELETE',
        url: this.getUrl(profile, integrationId),
        headers: { Authorization: `bearer ${profile.accessToken}` },
      }
    );

    await this.executeService.result(
      'Integration Removed',
      Text.create("Integration '", Text.bold(`${integrationId}`), "' was successfully removed")
    );
  }

  public async getIntegrationLogs(integrationId: string): Promise<void> {
    const profile = await this.profileService.getExecutionProfile(['account', 'subscription']);

    const functionService = await FunctionService.create(this.input);

    profile.boundary = 'integration';
    profile.function = integrationId;
    return functionService.getFunctionLogsByProfile(profile);
  }
}
