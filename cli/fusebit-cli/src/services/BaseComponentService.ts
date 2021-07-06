import { join } from 'path';
import { request, IHttpResponse } from '@5qtrs/request';

import globby from 'globby';
import { readFile, writeFile } from '@5qtrs/file';

import { Text } from '@5qtrs/text';
import { IExecuteInput, Confirm } from '@5qtrs/cli';
import { ProfileService } from './ProfileService';
import { ExecuteService } from './ExecuteService';
import { IFusebitExecutionProfile } from '@5qtrs/fusebit-profile-sdk';

import { FunctionService } from './FunctionService';

import { EntityType, ISdkEntity, IIntegrationData, IConnectorData } from '@fusebit/schema';

const FusebitStateFile = '.fusebit-state';
const FusebitMetadataFile = 'fusebit.json';
const DefaultIgnores = ['node_modules', FusebitStateFile];

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

export abstract class BaseComponentService<IComponentType extends IBaseComponentType> {
  protected profileService: ProfileService;
  protected executeService: ExecuteService;
  protected input: IExecuteInput;

  protected abstract entityType: EntityType;

  constructor(profileService: ProfileService, executeService: ExecuteService, input: IExecuteInput) {
    this.input = input;
    this.profileService = profileService;
    this.executeService = executeService;
  }

  public abstract createEmptySpec(): IComponentType;

  public async createNewSpec(): Promise<IComponentType> {
    const profile = await this.profileService.getExecutionProfile(['account', 'subscription']);
    const response = await request({
      method: 'GET',
      url: this.getUrl(profile, '?defaults=true'),
      headers: {
        Authorization: `Bearer ${profile.accessToken}`,
      },
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

    // Load package.json, if any.  Only include the type for the files parameter, as that's all that's used
    // here.
    let pack: { files: string[] } | undefined;
    try {
      const buffer = await readFile(join(cwd, 'package.json'));
      pack = JSON.parse(buffer.toString());
      entitySpec.data.files['package.json'] = buffer.toString();
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

    // Load fusebit.json, if any.
    try {
      const buffer = await readFile(join(cwd, FusebitMetadataFile));
      const config = JSON.parse(buffer.toString());

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
      // do nothing
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
      Object.entries(spec.data.files).map(async ([filename, contents]: string[]) => {
        await writeFile(join(cwd, filename), contents);
      })
    );
    delete spec.data.files;

    // Reconstruct the fusebit.json file
    const config = {
      id: spec.id,
      tags: spec.tags,
      expires: spec.expires,
      ...spec.data,
    };

    await writeFile(join(cwd, FusebitMetadataFile), JSON.stringify(config, null, 2));
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
      if (files.length) {
        const confirmPrompt = await Confirm.create({
          header: 'Deploy?',
          message: Text.create(`Deploy the ${this.entityType} in the '`, Text.bold(path), "' directory?"),
        });
        const confirmed = await confirmPrompt.prompt(this.input.io);
        if (!confirmed) {
          await this.executeService.warning(
            'Deploy Canceled',
            Text.create("Deploying the '", Text.bold(entityId), `' ${this.entityType} was canceled`)
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
    return request({
      method: 'GET',
      url: this.getUrl(profile, entityId),
      headers: {
        Authorization: `Bearer ${profile.accessToken}`,
      },
    });
  }

  public async fetchEntity(entityId: string): Promise<IComponentType> {
    const profile = await this.profileService.getExecutionProfile(['account', 'subscription']);
    return this.executeService.executeRequest(
      {
        header: 'Getting Entity',
        message: Text.create(`Getting existing ${this.entityType} '`, Text.bold(`${entityId}`), "'..."),
        errorHeader: 'Get Entity Error',
        errorMessage: Text.create(`Unable to get ${this.entityType} '`, Text.bold(`${entityId}`), "'"),
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
    let url: string = this.getUrl(profile);

    entitySpec.id = entityId;

    await this.executeService.execute(
      {
        header: 'Checking Entity',
        message: Text.create(`Checking existing ${this.entityType} '`, Text.bold(entityId), "'..."),
        errorHeader: 'Check Entity Error',
        errorMessage: Text.create(`Unable to check ${this.entityType} '`, Text.bold(entityId), "'"),
      },
      async () => {
        const response = await this.getEntity(profile, entityId);
        if (response.status === 200) {
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
        header: 'Deploy Entity',
        message: Text.create(`Deploying ${this.entityType} '`, Text.bold(entityId), "'..."),
        errorHeader: 'Deploy Integration Error',
        errorMessage: Text.create(`Unable to deploy ${this.entityType} '`, Text.bold(entityId), "'"),
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
        message: Text.create(`Listing ${this.entityType}...`),
        errorHeader: 'List Entity Error',
        errorMessage: Text.create(`Unable to list ${this.entityType}`),
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
        message: Text.create("Permanently remove the '", Text.bold(entityId), `' ${this.entityType}?`),
      });
      const confirmed = await confirmPrompt.prompt(this.input.io);
      if (!confirmed) {
        await this.executeService.warning(
          'Remove Canceled',
          Text.create("Removing the '", Text.bold(entityId), `' ${this.entityType} was canceled`)
        );
        throw new Error('Remove Canceled');
      }
    }
  }

  public async removeEntity(entityId: string): Promise<void> {
    const profile = await this.profileService.getExecutionProfile(['account', 'subscription']);

    await this.executeService.executeRequest(
      {
        header: 'Remove Entity',
        message: Text.create(`Removing ${this.entityType} '`, Text.bold(entityId), "'..."),
        errorHeader: 'Remove Entity Error',
        errorMessage: Text.create(`Unable to remove ${this.entityType} '`, Text.bold(entityId), "'"),
      },
      {
        method: 'DELETE',
        url: this.getUrl(profile, entityId),
        headers: { Authorization: `bearer ${profile.accessToken}` },
      }
    );

    await this.executeService.result(
      'Entity Removed',
      Text.create("Entity '", Text.bold(entityId), "' was successfully removed")
    );
  }

  public async getEntityLogs(entityId: string): Promise<void> {
    const profile = await this.profileService.getExecutionProfile(['account', 'subscription']);

    const functionService = await FunctionService.create(this.input);

    profile.boundary = this.entityType;
    profile.function = entityId;
    return functionService.getFunctionLogsByProfile(profile);
  }
}
