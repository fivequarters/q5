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

  public static async create(input: IExecuteInput) {
    const executeService = await ExecuteService.create(input);
    const profileService = await ProfileService.create(input);
    return new StorageService(profileService, executeService, input);
  }

  public getUrl(profile: IFusebitExecutionProfile, storageId: string = ''): string {
    return `${profile.baseUrl}/v1/account/${profile.account}/subscription/${profile.subscription}/storage${
      storageId ? '/' + storageId : ''
    }`;
  }

  public async getStorage(profile: IFusebitExecutionProfile, storageId: string): Promise<IHttpResponse> {
    return request({
      method: 'GET',
      url: this.getUrl(profile, storageId),
      headers: {
        Authorization: `Bearer ${profile.accessToken}`,
      },
    });
  }

  public async fetchStorage(storageId: string): Promise<any> {
    const profile = await this.profileService.getExecutionProfile(['account', 'subscription']);
    return this.executeService.executeRequest(
      {
        header: 'Getting Storage',
        message: Text.create("Getting existing storage '", Text.bold(`${storageId}`), "'..."),
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

  public async listStorage(options: IFusebitStorageListOptions): Promise<IFusebitStorageListResult> {
    const profile = await this.profileService.getExecutionProfile(['account', 'subscription']);
    const query = [];
    if (options.count) {
      query.push(`count=${options.count}`);
    }
    if (options.next) {
      query.push(`next=${options.next}`);
    }
    const queryString = (options.storageId ? `/${options.storageId}` : '') + `?${query.join('&')}`;

    const result = await this.executeService.executeRequest(
      {
        header: 'List Storage',
        message: Text.create('Listing storage...'),
        errorHeader: 'List Storages Error',
        errorMessage: Text.create('Unable to list storage'),
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

    console.log(item);

    await this.executeService.message(
      Text.bold(item.storageId),
      Text.create([
        ...(item.data ? [`Value: `, Text.bold(item.data), Text.eol(), Text.eol()] : []),
        ...tagSummary,
        ...expiresSummary,
        'Version',
        Text.dim(': '),
        item.etag || 'unknown',
        Text.eol(),
      ])
    );
  }

  public async displayStorages(items: IStorageSpec[], firstDisplay: boolean) {
    if (!items.length) {
      await this.executeService.info('No Storage Entries', `No ${firstDisplay ? '' : 'more '}storage entries to list`);
      return;
    }

    for (const item of items) {
      await this.displayStorage(item);
    }
  }

  public async confirmRemove(storageId: string): Promise<boolean> {
    if (!this.input.options.quiet) {
      const confirmPrompt = await Confirm.create({
        header: 'Remove?',
        message: Text.create("Permanently remove the '", Text.bold(storageId), "' storage?"),
      });
      const confirmed = await confirmPrompt.prompt(this.input.io);
      if (!confirmed) {
        await this.executeService.warning(
          'Remove Canceled',
          Text.create("Removing the '", Text.bold(storageId), "' storage was canceled")
        );
        throw new Error('Remove Canceled');
      }
    }
    return true;
  }

  public async removeStorage(storageId: string): Promise<void> {
    const profile = await this.profileService.getExecutionProfile(['account', 'subscription']);

    await this.executeService.executeRequest(
      {
        header: 'Remove Storage',
        message: Text.create("Removing storage '", Text.bold(`${storageId}`), "'..."),
        errorHeader: 'Remove Storage Error',
        errorMessage: Text.create(
          "Unable to remove storage '",
          Text.bold(`${profile.storage}`),
          "' in boundary '",
          Text.bold(`${profile.boundary}`),
          "'"
        ),
      },
      {
        method: 'DELETE',
        url: this.getUrl(profile, storageId),
        headers: { Authorization: `bearer ${profile.accessToken}` },
      }
    );

    await this.executeService.result(
      'Storage Removed',
      Text.create("Storage '", Text.bold(`${storageId}`), "' was successfully removed")
    );
  }
}
