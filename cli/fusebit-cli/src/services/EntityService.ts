import { Text } from '@5qtrs/text';
import { IFusebitExecutionProfile } from '@5qtrs/fusebit-profile-sdk';
import { IExecuteInput, Confirm, Message } from '@5qtrs/cli';
import { ProfileService } from './ProfileService';
import { ExecuteService } from './ExecuteService';
import { IEntityCommandOptions } from '../commands/common/entity/EntityCommandOptions';

export const FusebitTenantTag = 'fusebit.tenantId';

export interface IFusebitEntityListOptions {
  storageId?: string;
  next?: string;
  count?: number;
}

export interface IFusebitEntityListResult {
  items: IEntitySpec[];
  next?: string;
}

export interface IEntitySpec {
  id: string;
  data: any;
  tags: { [key: string]: string };
  version?: string;
  state: string;
  dateModified?: string;
}

export class EntityService {
  private profileService: ProfileService;
  private executeService: ExecuteService;
  private input: IExecuteInput;
  private entityOptions: IEntityCommandOptions;

  private constructor(
    profileService: ProfileService,
    executeService: ExecuteService,
    input: IExecuteInput,
    entityOptions: IEntityCommandOptions
  ) {
    this.input = input;
    this.profileService = profileService;
    this.executeService = executeService;
    this.entityOptions = entityOptions;
  }

  public static async create(input: IExecuteInput, entityOptions: IEntityCommandOptions) {
    const executeService = await ExecuteService.create(input);
    const profileService = await ProfileService.create(input);
    return new EntityService(profileService, executeService, input, entityOptions);
  }

  public getUrl(profile: IFusebitExecutionProfile, parentEntityId: string, entityId?: string): string {
    const result = `${profile.baseUrl}/v2/account/${profile.account}/subscription/${profile.subscription}/${
      this.entityOptions.parentEntityUrlSegment
    }/${parentEntityId}/${this.entityOptions.entityUrlSegment}/${entityId || ''}`;
    return result;
  }

  public async fetchEntity(parentEntityId: string, entityId: string): Promise<any> {
    const profile = await this.profileService.getExecutionProfile(['account', 'subscription']);
    return this.executeService.executeRequest(
      {
        header: `Getting ${this.entityOptions.capitalSingular}`,
        message: Text.create(
          `Getting existing ${this.entityOptions.singular} '`,
          Text.bold(entityId),
          `' of ${this.entityOptions.parentName} '`,
          Text.bold(parentEntityId),
          `'...`
        ),
        errorHeader: `Get ${this.entityOptions.capitalSingular} Error`,
        errorMessage: Text.create(`Unable to get ${this.entityOptions.singular} '`, Text.bold(`${entityId}`), "'"),
      },
      {
        method: 'GET',
        url: this.getUrl(profile, parentEntityId, entityId),
        headers: {
          Authorization: `Bearer ${profile.accessToken}`,
        },
      }
    );
  }

  public async listEntities(
    parentEntityId: string,
    tags: string[],
    options: IFusebitEntityListOptions
  ): Promise<IFusebitEntityListResult> {
    const profile = await this.profileService.getExecutionProfile(['account', 'subscription']);
    const query = [];
    if (options.count) {
      query.push(`count=${options.count}`);
    }
    if (options.next) {
      query.push(`next=${options.next}`);
    }
    tags.forEach((t) => query.push(`tag=${encodeURIComponent(t)}`));
    const queryString = `?${query.join('&')}`;
    const result = await this.executeService.executeRequest(
      {
        header: `List ${this.entityOptions.capitalPlural}`,
        message: Text.create(
          `Listing ${this.entityOptions.plural} of ${this.entityOptions.parentName} '`,
          Text.bold(parentEntityId),
          `'...`
        ),
        errorHeader: `List ${this.entityOptions.capitalPlural} Error`,
        errorMessage: Text.create(`Unable to list ${this.entityOptions.plural}`),
      },
      {
        method: 'GET',
        url: `${this.getUrl(profile, parentEntityId)}${queryString}`,
        headers: { Authorization: `bearer ${profile.accessToken}` },
      }
    );

    return result;
  }

  public async confirmListMore(): Promise<boolean> {
    const result = await this.input.io.prompt({ prompt: 'Get More Entries?', yesNo: true });
    return result.length > 0;
  }

  public async displayEntity(item: IEntitySpec) {
    await this.writeEntity(item, true);
  }

  public async displayEntities(items: IEntitySpec[], firstDisplay: boolean) {
    if (!items.length) {
      await this.executeService.info(
        `No ${this.entityOptions.capitalPlural}`,
        `No ${firstDisplay ? '' : 'more '}${this.entityOptions.singular} entries to list`
      );
      return;
    }

    const message = await Message.create({
      header: Text.cyan(this.entityOptions.capitalPlural),
      message: Text.cyan('Details'),
    });
    await message.write(this.input.io);

    for (const item of items) {
      await this.writeEntity(item);
    }
  }

  private async writeEntity(item: IEntitySpec, showDetails?: boolean) {
    const details = [Text.dim(`${this.entityOptions.capitalSingular}: `), item.id || ''];

    details.push(Text.eol(), Text.dim('State: '), item.state);
    if (item.tags && item.tags[FusebitTenantTag]) {
      details.push(Text.eol(), Text.dim(`${this.entityOptions.tenantName}: `), item.tags[this.entityOptions.tenantTag]);
    }
    if (item.dateModified) {
      details.push(Text.eol(), Text.dim('Last modified: '), item.dateModified);
    }

    const keys = Object.keys(item.tags);
    details.push(Text.eol(), Text.dim('Tags: '));
    if (keys.length === 0) {
      details.push('No tags');
    } else {
      details.push(Text.eol());
      keys.forEach((key) => {
        details.push(Text.dim('• '), key, Text.dim(': '), item.tags[key] || 'null', Text.eol());
      });
    }
    if (showDetails) {
      details.push(Text.eol(), Text.dim('Version: '), item.version || 'unknown');
    }

    const message = await Message.create({
      header: item.id,
      message: Text.create(details),
    });

    await message.write(this.input.io);
  }

  public async confirmRemove(parentEntityId: string, entityId: string): Promise<boolean> {
    if (!this.input.options.quiet) {
      const confirmPrompt = await Confirm.create({
        header: 'Remove?',
        message: Text.create("Permanently remove the '", Text.bold(entityId), `' ${this.entityOptions.singular}?`),
      });
      const confirmed = await confirmPrompt.prompt(this.input.io);
      if (!confirmed) {
        await this.executeService.warning(
          'Remove Canceled',
          Text.create("Removing the '", Text.bold(entityId), `' ${this.entityOptions.singular} was canceled`)
        );
        throw new Error('Remove Canceled');
      }
    }
    return true;
  }

  public async removeEntity(parentEntityId: string, entityId: string): Promise<void> {
    const profile = await this.profileService.getExecutionProfile(['account', 'subscription']);

    await this.executeService.executeRequest(
      {
        header: `Remove ${this.entityOptions.capitalSingular}`,
        message: Text.create(`Removing ${this.entityOptions.singular} '`, Text.bold(`${entityId}`), "'..."),
        errorHeader: `Remove ${this.entityOptions.capitalSingular} Error`,
        errorMessage: Text.create(`Unable to remove ${this.entityOptions.singular} '`, Text.bold(`${entityId}`), "'"),
      },
      {
        method: 'DELETE',
        url: this.getUrl(profile, parentEntityId, entityId),
        headers: { Authorization: `bearer ${profile.accessToken}` },
      }
    );

    await this.executeService.result(
      `${this.entityOptions.capitalSingular} Removed`,
      Text.create(`${this.entityOptions.capitalSingular} '`, Text.bold(`${entityId}`), "' was successfully removed")
    );
  }
}
