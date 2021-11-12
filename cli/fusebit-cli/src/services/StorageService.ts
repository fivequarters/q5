import { Text } from '@5qtrs/text';
import { IFusebitExecutionProfile } from '@5qtrs/fusebit-profile-sdk';
import { IExecuteInput, Confirm } from '@5qtrs/cli';
import { ProfileService } from './ProfileService';
import { ExecuteService } from './ExecuteService';

export interface IFusebitStorageListOptions {
  storageId?: string;
  next?: string;
  count?: number;
}

export interface IFusebitStorageListResult {
  items: any[];
  next?: string;
}

export interface IStorageSpec {
  storageId: string;
  data: any;
  tags: { [key: string]: string };
  etag?: string;
  expires?: string;
  expiresDuration?: string;
}

export class StorageService {
  private profileService: ProfileService;
  private executeService: ExecuteService;
  private input: IExecuteInput;

  private constructor(profileService: ProfileService, executeService: ExecuteService, input: IExecuteInput) {
    this.input = input;
    this.profileService = profileService;
    this.executeService = executeService;
  }

  public static normalizeStorageId(storageId: string, skipSlash?: boolean) {
    return `${skipSlash ? '' : '/'}${storageId.replace(/^\/(.*)$/, '$1').replace(/^(.*)\/$/, '$1')}${
      skipSlash ? '' : '/'
    }`.replace('//', '/');
  }

  public static async create(input: IExecuteInput) {
    const executeService = await ExecuteService.create(input);
    const profileService = await ProfileService.create(input);
    return new StorageService(profileService, executeService, input);
  }

  public getUrl(profile: IFusebitExecutionProfile, storageId: string = ''): string {
    const result = `${profile.baseUrl}/v1/account/${profile.account}/subscription/${profile.subscription}/storage${storageId}`;
    return result;
  }

  public async fetchStorage(storageId: string): Promise<any> {
    const profile = await this.profileService.getExecutionProfile(['account', 'subscription']);
    return this.executeService.executeRequest(
      {
        header: 'Getting Storage',
        message: Text.create(
          "Getting existing storage item '",
          Text.bold(`${StorageService.normalizeStorageId(storageId, true)}`),
          "'..."
        ),
        errorHeader: 'Get Storage Error',
        errorMessage: Text.create("Unable to get storage '", Text.bold(`${storageId}`), "'"),
      },
      {
        method: 'GET',
        url: this.getUrl(profile, storageId),
        headers: {
          Authorization: `Bearer ${profile.accessToken}`,
        },
      }
    );
  }

  public async putStorage(payload: any): Promise<any> {
    const profile = await this.profileService.getExecutionProfile(['account', 'subscription']);
    return this.executeService.executeRequest(
      {
        header: 'Upserting Storage',
        message: Text.create("Upserting storage item '", Text.bold(`${payload.storageId}`), "'..."),
        errorHeader: 'Upsert Storage Error',
        errorMessage: Text.create("Unable to upsert storage '", Text.bold(`${payload.storageId}`), "'"),
      },
      {
        method: 'PUT',
        url: this.getUrl(profile, StorageService.normalizeStorageId(payload.storageId)),
        headers: {
          Authorization: `Bearer ${profile.accessToken}`,
        },
        data: payload,
      }
    );
  }

  public async listStorage(
    prefix: string,
    tags: string[],
    options: IFusebitStorageListOptions
  ): Promise<IFusebitStorageListResult> {
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
        header: 'List Storage',
        message: Text.create('Listing storage...'),
        errorHeader: 'List Storage Error',
        errorMessage: Text.create('Unable to list storage'),
      },
      {
        method: 'GET',
        url: `${this.getUrl(profile, prefix)}${queryString}`,
        headers: { Authorization: `bearer ${profile.accessToken}` },
      }
    );

    return result;
  }

  public async confirmListMore(): Promise<boolean> {
    const result = await this.input.io.prompt({ prompt: 'Get More Entries?', yesNo: true });
    return result.length > 0;
  }

  public async displayStorage(item: IStorageSpec) {
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
      Text.bold(item.storageId),
      Text.create([...tagSummary, ...expiresSummary, 'Version', Text.dim(': '), item.etag || 'unknown', Text.eol()])
    );

    const json = JSON.stringify(item, null, 2);
    await this.input.io.writeLineRaw(json);
  }

  public async displayStorages(items: IStorageSpec[], firstDisplay: boolean) {
    if (!items.length) {
      await this.executeService.info('No Storage Entries', `No ${firstDisplay ? '' : 'more '}storage entries to list`);
      return;
    }

    for (const item of items) {
      console.log(item.storageId);
    }
  }

  public async confirmRemove(storageId: string): Promise<boolean> {
    const storageDisplayName = StorageService.normalizeStorageId(storageId, true);
    if (!this.input.options.quiet) {
      const confirmPrompt = await Confirm.create({
        header: 'Remove?',
        message: Text.create("Permanently remove the '", Text.bold(storageDisplayName), "' storage?"),
      });
      const confirmed = await confirmPrompt.prompt(this.input.io);
      if (!confirmed) {
        await this.executeService.warning(
          'Remove Canceled',
          Text.create("Removing the '", Text.bold(storageDisplayName), "' storage was canceled")
        );
        throw new Error('Remove Canceled');
      }
    }
    return true;
  }

  public async removeStorage(storageId: string): Promise<void> {
    const storageDisplayName = StorageService.normalizeStorageId(storageId, true);
    const profile = await this.profileService.getExecutionProfile(['account', 'subscription']);

    await this.executeService.executeRequest(
      {
        header: 'Remove Storage',
        message: Text.create("Removing storage '", Text.bold(`${storageDisplayName}`), "'..."),
        errorHeader: 'Remove Storage Error',
        errorMessage: Text.create("Unable to remove storage item '", Text.bold(`${storageDisplayName}`), "'"),
      },
      {
        method: 'DELETE',
        url: this.getUrl(profile, storageId),
        headers: { Authorization: `bearer ${profile.accessToken}` },
      }
    );

    await this.executeService.result(
      'Storage Removed',
      Text.create("Storage item '", Text.bold(`${storageDisplayName}`), "' was successfully removed")
    );
  }
}
