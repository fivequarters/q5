import { Text } from '@5qtrs/text';
import { IExecuteInput } from '@5qtrs/cli';
import { ProfileService } from './ProfileService';
import { ExecuteService } from './ExecuteService';

import { IBaseComponentType, BaseComponentService } from './BaseComponentService';

import { IConnectorData } from '@fusebit/schema';

interface IConnector extends IBaseComponentType {
  data: IConnectorData;
}

export class ConnectorService extends BaseComponentService<IConnector> {
  protected entityType: string;

  private constructor(profileService: ProfileService, executeService: ExecuteService, input: IExecuteInput) {
    super(profileService, executeService, input);
    this.entityType = 'connector';
  }

  public static async create(input: IExecuteInput) {
    const executeService = await ExecuteService.create(input);
    const profileService = await ProfileService.create(input);
    return new ConnectorService(profileService, executeService, input);
  }

  public createEmptySpec(): IConnector {
    return {
      id: 'unknown id',
      data: { handler: '', configuration: {}, files: {} },
      tags: {},
    };
  }

  public async displayEntities(items: IConnector[], firstDisplay: boolean) {
    const profile = await this.profileService.getExecutionProfile(['account', 'subscription']);
    if (!items.length) {
      await this.executeService.info('No Connectors', `No ${firstDisplay ? '' : 'more '}connectors to list`);
      return;
    }

    for (const item of items) {
      const tagSummary = ['Tags:', Text.eol()];

      if (item.tags) {
        Object.entries(item.tags).forEach(([tagKey, tagValue]: [string, string]) => {
          tagSummary.push(Text.dim('• '));
          tagSummary.push(tagKey);
          tagSummary.push(Text.dim(': '));
          tagSummary.push(tagValue);
          tagSummary.push(Text.eol());
        });
      }

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
          Text.eol(),
          'Base URL',
          Text.dim(': '),
          this.getUrl(profile, item.id),
        ])
      );
    }
  }
}
